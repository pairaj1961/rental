import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── PATCH /api/deliveries/[id] ────────────────────────────────────────────────
// Transitions: SCHEDULED → COMPLETED | CANCELLED
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
    const { status: newStatus, actualDate, notes, driverName, driverPhone, vehiclePlate } = body ?? {};

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const { rows: cur } = await pool.query(
      `SELECT status FROM rental.delivery_schedules WHERE id = $1`,
      [id],
    );
    if (!cur[0]) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

    const currentStatus = cur[0].status as string;

    const VALID: Record<string, string[]> = {
      SCHEDULED: ['COMPLETED', 'CANCELLED'],
      OVERDUE:   ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!VALID[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition delivery from ${currentStatus} to ${newStatus}`,
      }, { status: 400 });
    }

    const now  = new Date();
    const sets = ['status = $1'];
    const qp: unknown[] = [newStatus];

    if (newStatus === 'COMPLETED') {
      qp.push(actualDate ? new Date(actualDate) : now);
      sets.push(`actual_date = $${qp.length}`);
    }
    if (driverName !== undefined) { qp.push(driverName?.trim() ?? null); sets.push(`driver_name = $${qp.length}`); }
    if (driverPhone !== undefined) { qp.push(driverPhone?.trim() ?? null); sets.push(`driver_phone = $${qp.length}`); }
    if (vehiclePlate !== undefined) { qp.push(vehiclePlate?.trim() ?? null); sets.push(`vehicle_plate = $${qp.length}`); }
    if (notes !== undefined) { qp.push(notes?.trim() ?? null); sets.push(`notes = $${qp.length}`); }

    qp.push(id);
    await pool.query(
      `UPDATE rental.delivery_schedules SET ${sets.join(', ')} WHERE id = $${qp.length}`,
      qp,
    );

    return NextResponse.json({ data: { id, status: newStatus } });
  } catch (err) {
    console.error('[api/deliveries/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
