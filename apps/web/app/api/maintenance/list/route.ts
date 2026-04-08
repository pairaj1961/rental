import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status      = searchParams.get('status');
  const type        = searchParams.get('type');
  const equipmentId = searchParams.get('equipmentId');
  const search      = searchParams.get('search');

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (status) { params.push(status); conditions.push(`mr.status = $${params.length}`); }
  if (type)   { params.push(type);   conditions.push(`mr.type = $${params.length}`); }
  if (equipmentId) { params.push(equipmentId); conditions.push(`mr.equipment_id = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(e.serial_number ILIKE $${n} OR e.asset_tag ILIKE $${n} OR mr.technician_name ILIKE $${n} OR mr.description ILIKE $${n})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT mr.id, mr.equipment_id, mr.type, mr.status,
              mr.scheduled_date, mr.completed_date, mr.description,
              mr.technician_name, mr.labor_cost, mr.parts_cost, mr.total_cost,
              mr.created_at,
              e.serial_number, e.asset_tag,
              p.model_name AS product_name
       FROM rental.maintenance_records mr
       JOIN rental.equipment e ON e.id = mr.equipment_id
       LEFT JOIN public.products p ON p.id = e.product_id
       ${where}
       ORDER BY mr.scheduled_date DESC
       LIMIT 200`,
      params,
    );

    return NextResponse.json({
      data: rows.map((r) => ({
        id:             r.id,
        equipmentId:    r.equipment_id,
        serialNumber:   r.serial_number,
        assetTag:       r.asset_tag,
        productName:    r.product_name,
        type:           r.type,
        status:         r.status,
        scheduledDate:  r.scheduled_date?.toISOString() ?? null,
        completedDate:  r.completed_date?.toISOString() ?? null,
        description:    r.description,
        technicianName: r.technician_name,
        laborCost:      r.labor_cost,
        partsCost:      r.parts_cost,
        totalCost:      r.total_cost,
        createdAt:      r.created_at?.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[api/maintenance/list GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
