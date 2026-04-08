import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value
      ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      ?? null;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      contractsRes,
      availableRes,
      overdueRes,
      deliveriesRes,
      maintenanceRes,
    ] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM rental.rental_contracts WHERE status = 'ACTIVE'`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM rental.equipment WHERE status = 'AVAILABLE'`,
      ),
      pool.query<{ count: string; total: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(total), 0)::text AS total
         FROM rental.rental_invoices WHERE status = 'OVERDUE'`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM rental.delivery_schedules
         WHERE type = 'DELIVERY'
           AND status NOT IN ('COMPLETED', 'CANCELLED')
           AND scheduled_date >= $1
           AND scheduled_date <= $2`,
        [now, in7Days],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM rental.equipment WHERE status = 'MAINTENANCE'`,
      ),
    ]);

    return NextResponse.json({
      activeContracts:       parseInt(contractsRes.rows[0].count, 10),
      availableEquipment:    parseInt(availableRes.rows[0].count, 10),
      overdueInvoices: {
        count: parseInt(overdueRes.rows[0].count, 10),
        total: parseFloat(overdueRes.rows[0].total),
      },
      upcomingDeliveries:    parseInt(deliveriesRes.rows[0].count, 10),
      equipmentInMaintenance: parseInt(maintenanceRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('[dashboard/overview]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
