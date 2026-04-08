import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── GET /api/equipment/[id] ────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Equipment + product info
    const { rows: eqRows } = await pool.query(
      `SELECT e.id, e.asset_tag, e.serial_number, e.product_id,
              e.condition, e.status,
              e.purchase_date, e.purchase_price, e.current_location,
              e.notes, e.is_active, e.created_at, e.updated_at,
              p.model_name AS product_name, p.model_number, p.sku,
              p.description AS product_description,
              p.rental_daily_rate, p.rental_weekly_rate, p.rental_monthly_rate,
              b.name AS brand_name,
              pc.name AS category_name
       FROM rental.equipment e
       JOIN public.products          p  ON p.id  = e.product_id
       JOIN public.brands            b  ON b.id  = p.brand_id
       JOIN public.product_categories pc ON pc.id = p.category_id
       WHERE e.id = $1`,
      [id],
    );

    if (!eqRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Maintenance records (newest first)
    const { rows: maintRows } = await pool.query(
      `SELECT id, type, scheduled_date, completed_date, description,
              technician_name, labor_cost, parts_cost, total_cost, status, notes, created_at
       FROM rental.maintenance_records
       WHERE equipment_id = $1
       ORDER BY scheduled_date DESC`,
      [id],
    );

    // Rental history via contract items, with contract + customer info
    const { rows: rentalRows } = await pool.query(
      `SELECT rci.id, rci.contract_id, rci.quantity, rci.agreed_rate, rci.agreed_rate_type, rci.subtotal,
              rc.contract_number, rc.status AS contract_status,
              rc.start_date, rc.end_date, rc.actual_return_date,
              c.company_name AS customer_name
       FROM rental.rental_contract_items rci
       JOIN rental.rental_contracts rc ON rc.id = rci.contract_id
       JOIN public.customers c ON c.id = rc.customer_id
       WHERE rci.equipment_id = $1
       ORDER BY rc.start_date DESC`,
      [id],
    );

    const equipment = eqRows[0];

    return NextResponse.json({
      data: {
        id:              equipment.id,
        assetTag:        equipment.asset_tag,
        serialNumber:    equipment.serial_number,
        productId:       equipment.product_id,
        productName:     equipment.product_name,
        modelNumber:     equipment.model_number,
        sku:             equipment.sku,
        productDescription: equipment.product_description,
        rentalDailyRate: equipment.rental_daily_rate,
        rentalWeeklyRate: equipment.rental_weekly_rate,
        rentalMonthlyRate: equipment.rental_monthly_rate,
        brandName:       equipment.brand_name,
        categoryName:    equipment.category_name,
        condition:       equipment.condition,
        status:          equipment.status,
        purchaseDate:    equipment.purchase_date?.toISOString() ?? null,
        purchasePrice:   equipment.purchase_price,
        currentLocation: equipment.current_location,
        notes:           equipment.notes,
        isActive:        equipment.is_active,
        createdAt:       equipment.created_at?.toISOString(),
        updatedAt:       equipment.updated_at?.toISOString(),
        maintenanceRecords: maintRows.map((m) => ({
          id:             m.id,
          type:           m.type,
          scheduledDate:  m.scheduled_date?.toISOString() ?? null,
          completedDate:  m.completed_date?.toISOString() ?? null,
          description:    m.description,
          technicianName: m.technician_name,
          laborCost:      m.labor_cost,
          partsCost:      m.parts_cost,
          totalCost:      m.total_cost,
          status:         m.status,
          notes:          m.notes,
          createdAt:      m.created_at?.toISOString(),
        })),
        rentalHistory: rentalRows.map((r) => ({
          id:               r.id,
          contractId:       r.contract_id,
          contractNumber:   r.contract_number,
          contractStatus:   r.contract_status,
          customerName:     r.customer_name,
          quantity:         r.quantity,
          agreedRate:       r.agreed_rate,
          agreedRateType:   r.agreed_rate_type,
          subtotal:         r.subtotal,
          startDate:        r.start_date?.toISOString() ?? null,
          endDate:          r.end_date?.toISOString() ?? null,
          actualReturnDate: r.actual_return_date?.toISOString() ?? null,
        })),
      },
    });
  } catch (err) {
    console.error('[api/equipment/[id] GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /api/equipment/[id] ──────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'PRODUCTION_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Build update SET clause dynamically from allowed fields
    const allowed = ['condition', 'status', 'asset_tag', 'current_location', 'notes', 'purchase_date', 'purchase_price'];
    const fieldMap: Record<string, string> = {
      condition: 'condition', status: 'status',
      assetTag: 'asset_tag', currentLocation: 'current_location',
      notes: 'notes', purchaseDate: 'purchase_date', purchasePrice: 'purchase_price',
    };

    const sets: string[] = [];
    const params: unknown[] = [];

    for (const [jsKey, colName] of Object.entries(fieldMap)) {
      if (jsKey in body) {
        params.push(jsKey === 'purchaseDate' && body[jsKey] ? new Date(body[jsKey]) : body[jsKey]);
        sets.push(`${colName} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(new Date()); // updated_at
    sets.push(`updated_at = $${params.length}`);

    params.push(id);

    await pool.query(
      `UPDATE rental.equipment SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    // Re-fetch updated record
    const { rows } = await pool.query(
      `SELECT e.id, e.asset_tag, e.serial_number, e.product_id,
              e.condition, e.status,
              e.purchase_date, e.purchase_price, e.current_location,
              e.notes, e.is_active, e.created_at, e.updated_at,
              p.model_name AS product_name, b.name AS brand_name, pc.name AS category_name
       FROM rental.equipment e
       JOIN public.products          p  ON p.id  = e.product_id
       JOIN public.brands            b  ON b.id  = p.brand_id
       JOIN public.product_categories pc ON pc.id = p.category_id
       WHERE e.id = $1`,
      [id],
    );

    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const r = rows[0];
    return NextResponse.json({
      data: {
        id: r.id, assetTag: r.asset_tag, serialNumber: r.serial_number,
        productName: r.product_name, brandName: r.brand_name, categoryName: r.category_name,
        condition: r.condition, status: r.status,
        currentLocation: r.current_location, updatedAt: r.updated_at?.toISOString(),
      },
    });
  } catch (err) {
    console.error('[api/equipment/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
