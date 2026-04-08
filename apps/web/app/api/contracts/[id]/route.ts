import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── GET /api/contracts/[id] ───────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { rows } = await pool.query(
      `SELECT rc.id, rc.contract_number, rc.status, rc.payment_status,
              rc.start_date, rc.end_date, rc.actual_return_date,
              rc.deposit_amount, rc.total_amount, rc.notes,
              rc.created_at, rc.updated_at,
              rc.customer_id, rc.site_id, rc.assigned_rep_id,
              rc.approved_by_id, rc.converted_from_quote_id,
              c.company_name AS customer_name, c.billing_address AS customer_address,
              cs.site_name, cs.address AS site_address,
              u.first_name || ' ' || u.last_name AS assigned_rep_name,
              ab.first_name || ' ' || ab.last_name AS approved_by_name
       FROM rental.rental_contracts rc
       JOIN public.customers c ON c.id = rc.customer_id
       LEFT JOIN public.customer_sites cs ON cs.id = rc.site_id
       LEFT JOIN public.users u  ON u.id  = rc.assigned_rep_id
       LEFT JOIN public.users ab ON ab.id = rc.approved_by_id
       WHERE rc.id = $1`,
      [id],
    );

    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Items with equipment + product details
    const { rows: itemRows } = await pool.query(
      `SELECT rci.id, rci.equipment_id, rci.product_id, rci.quantity,
              rci.agreed_rate, rci.agreed_rate_type, rci.subtotal, rci.notes,
              e.serial_number, e.asset_tag, e.condition, e.status AS equipment_status,
              p.model_name AS product_name, p.sku,
              b.name AS brand_name
       FROM rental.rental_contract_items rci
       JOIN rental.equipment e ON e.id = rci.equipment_id
       JOIN public.products  p ON p.id = rci.product_id
       JOIN public.brands    b ON b.id = p.brand_id
       WHERE rci.contract_id = $1`,
      [id],
    );

    // Delivery schedules
    const { rows: deliveryRows } = await pool.query(
      `SELECT id, type, scheduled_date, actual_date, address, province,
              driver_name, driver_phone, vehicle_plate, status, notes, created_at
       FROM rental.delivery_schedules
       WHERE contract_id = $1
       ORDER BY scheduled_date ASC`,
      [id],
    );

    // Invoices
    const { rows: invoiceRows } = await pool.query(
      `SELECT id, invoice_number, invoice_date, due_date, subtotal,
              tax_rate, tax_amount, discount, total, status,
              paid_at, paid_amount, notes, created_at
       FROM rental.rental_invoices
       WHERE contract_id = $1
       ORDER BY created_at DESC`,
      [id],
    );

    const r = rows[0];
    return NextResponse.json({
      data: {
        id:                   r.id,
        contractNumber:       r.contract_number,
        status:               r.status,
        paymentStatus:        r.payment_status,
        startDate:            r.start_date?.toISOString() ?? null,
        endDate:              r.end_date?.toISOString() ?? null,
        actualReturnDate:     r.actual_return_date?.toISOString() ?? null,
        depositAmount:        r.deposit_amount,
        totalAmount:          r.total_amount,
        notes:                r.notes,
        createdAt:            r.created_at?.toISOString(),
        updatedAt:            r.updated_at?.toISOString(),
        customerId:           r.customer_id,
        customerName:         r.customer_name,
        customerAddress:      r.customer_address,
        siteId:               r.site_id,
        siteName:             r.site_name,
        siteAddress:          r.site_address,
        assignedRepId:        r.assigned_rep_id,
        assignedRepName:      r.assigned_rep_name,
        approvedById:         r.approved_by_id,
        approvedByName:       r.approved_by_name,
        convertedFromQuoteId: r.converted_from_quote_id,
        items: itemRows.map((i) => ({
          id:              i.id,
          equipmentId:     i.equipment_id,
          productId:       i.product_id,
          quantity:        i.quantity,
          agreedRate:      i.agreed_rate,
          agreedRateType:  i.agreed_rate_type,
          subtotal:        i.subtotal,
          notes:           i.notes,
          serialNumber:    i.serial_number,
          assetTag:        i.asset_tag,
          condition:       i.condition,
          equipmentStatus: i.equipment_status,
          productName:     i.product_name,
          sku:             i.sku,
          brandName:       i.brand_name,
        })),
        deliveries: deliveryRows.map((d) => ({
          id:            d.id,
          type:          d.type,
          scheduledDate: d.scheduled_date?.toISOString() ?? null,
          actualDate:    d.actual_date?.toISOString() ?? null,
          address:       d.address,
          province:      d.province,
          driverName:    d.driver_name,
          driverPhone:   d.driver_phone,
          vehiclePlate:  d.vehicle_plate,
          status:        d.status,
          notes:         d.notes,
          createdAt:     d.created_at?.toISOString(),
        })),
        invoices: invoiceRows.map((inv) => ({
          id:            inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate:   inv.invoice_date?.toISOString() ?? null,
          dueDate:       inv.due_date?.toISOString() ?? null,
          subtotal:      inv.subtotal,
          taxRate:       inv.tax_rate,
          taxAmount:     inv.tax_amount,
          discount:      inv.discount,
          total:         inv.total,
          status:        inv.status,
          paidAt:        inv.paid_at?.toISOString() ?? null,
          paidAmount:    inv.paid_amount,
          notes:         inv.notes,
          createdAt:     inv.created_at?.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error('[api/contracts/[id] GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /api/contracts/[id] ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role    = req.headers.get('x-user-role') ?? '';
  const { id }  = await params;

  try {
    const body = await req.json();
    const { status: newStatus, notes, actualReturnDate } = body ?? {};

    if (!newStatus) return NextResponse.json({ error: 'status is required' }, { status: 400 });

    // Fetch current status
    const { rows: cur } = await pool.query(
      `SELECT status FROM rental.rental_contracts WHERE id = $1`,
      [id],
    );
    if (!cur[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const currentStatus = cur[0].status;

    // Validate state machine transitions
    const VALID: Record<string, string[]> = {
      DRAFT:     ['ACTIVE', 'CANCELLED'],
      ACTIVE:    ['COMPLETED', 'CANCELLED', 'EXTENDED'],
      EXTENDED:  ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!VALID[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition from ${currentStatus} to ${newStatus}`,
      }, { status: 400 });
    }

    // Activating requires MANAGER / ADMIN
    if (currentStatus === 'DRAFT' && newStatus === 'ACTIVE') {
      if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Only managers can activate contracts' }, { status: 403 });
      }
    }

    const now    = new Date();
    const sets   = ['status = $1', 'updated_at = $2'];
    const qp: unknown[] = [newStatus, now];

    if (newStatus === 'ACTIVE') {
      qp.push(userId);
      sets.push(`approved_by_id = $${qp.length}`);
    }

    if (newStatus === 'COMPLETED') {
      qp.push(actualReturnDate ? new Date(actualReturnDate) : now);
      sets.push(`actual_return_date = $${qp.length}`);
    }

    if (notes !== undefined) {
      qp.push(notes?.trim() ?? null);
      sets.push(`notes = $${qp.length}`);
    }

    qp.push(id);
    await pool.query(
      `UPDATE rental.rental_contracts SET ${sets.join(', ')} WHERE id = $${qp.length}`,
      qp,
    );

    // Sync equipment status
    if (newStatus === 'ACTIVE') {
      await pool.query(
        `UPDATE rental.equipment SET status = 'RENTED', updated_at = $1
         WHERE id IN (SELECT equipment_id FROM rental.rental_contract_items WHERE contract_id = $2)`,
        [now, id],
      );
    } else if (['COMPLETED', 'CANCELLED'].includes(newStatus)) {
      await pool.query(
        `UPDATE rental.equipment SET status = 'AVAILABLE', updated_at = $1
         WHERE id IN (SELECT equipment_id FROM rental.rental_contract_items WHERE contract_id = $2)`,
        [now, id],
      );
    }

    return NextResponse.json({ data: { id, status: newStatus } });
  } catch (err) {
    console.error('[api/contracts/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
