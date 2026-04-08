import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST /api/contracts/[id]/deliveries
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'PRODUCT_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: contractId } = await params;

  try {
    const body = await req.json();
    const {
      type = 'DELIVERY', scheduledDate, address, province,
      driverName, driverPhone, vehiclePlate, notes,
    } = body ?? {};

    if (!scheduledDate) {
      return NextResponse.json({ error: 'scheduledDate is required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT id FROM rental.rental_contracts WHERE id = $1`,
      [contractId],
    );
    if (!rows[0]) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const id  = randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO rental.delivery_schedules
         (id, contract_id, type, scheduled_date, address, province,
          driver_name, driver_phone, vehicle_plate, status, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SCHEDULED',$10,$11)`,
      [
        id, contractId, type, new Date(scheduledDate),
        address?.trim() ?? null, province?.trim() ?? null,
        driverName?.trim() ?? null, driverPhone?.trim() ?? null,
        vehiclePlate?.trim() ?? null, notes?.trim() ?? null,
        now,
      ],
    );

    return NextResponse.json({
      data: { id, contractId, type, scheduledDate, status: 'SCHEDULED' },
    }, { status: 201 });
  } catch (err) {
    console.error('[api/contracts/[id]/deliveries POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
