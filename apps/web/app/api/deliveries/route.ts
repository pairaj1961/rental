import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status     = searchParams.get('status');
  const type       = searchParams.get('type');
  const dateFrom   = searchParams.get('dateFrom');
  const dateTo     = searchParams.get('dateTo');
  const search     = searchParams.get('search');

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (status)   { params.push(status);           conditions.push(`ds.status = $${params.length}`); }
  if (type)     { params.push(type);             conditions.push(`ds.type = $${params.length}`); }
  if (dateFrom) { params.push(new Date(dateFrom)); conditions.push(`ds.scheduled_date >= $${params.length}`); }
  if (dateTo)   { params.push(new Date(dateTo));   conditions.push(`ds.scheduled_date <= $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(rc.contract_number ILIKE $${n} OR c.company_name ILIKE $${n} OR ds.driver_name ILIKE $${n} OR ds.address ILIKE $${n})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT ds.id, ds.contract_id, ds.type, ds.status,
              ds.scheduled_date, ds.actual_date, ds.address,
              ds.driver_name, ds.driver_phone, ds.vehicle_plate, ds.notes,
              ds.created_at,
              rc.contract_number,
              c.company_name AS customer_name
       FROM rental.delivery_schedules ds
       JOIN rental.rental_contracts rc ON rc.id = ds.contract_id
       JOIN public.customers c ON c.id = rc.customer_id
       ${where}
       ORDER BY ds.scheduled_date DESC
       LIMIT 200`,
      params,
    );

    return NextResponse.json({
      data: rows.map((r) => ({
        id:             r.id,
        contractId:     r.contract_id,
        contractNumber: r.contract_number,
        customerName:   r.customer_name,
        type:           r.type,
        status:         r.status,
        scheduledDate:  r.scheduled_date?.toISOString() ?? null,
        actualDate:     r.actual_date?.toISOString() ?? null,
        address:        r.address,
        driverName:     r.driver_name,
        driverPhone:    r.driver_phone,
        vehiclePlate:   r.vehicle_plate,
        notes:          r.notes,
        createdAt:      r.created_at?.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[api/deliveries GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
