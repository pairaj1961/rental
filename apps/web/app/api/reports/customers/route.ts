import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const toRaw = searchParams.get('to') ? new Date(searchParams.get('to')!) : now;
  const to = new Date(toRaw); to.setHours(23, 59, 59, 999);

  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.company_name AS "companyName",
              COUNT(rc.id)::int AS "totalRentals",
              COUNT(rc.id) FILTER (WHERE rc.status = 'ACTIVE')::int AS "activeRentals",
              COUNT(rc.id) FILTER (WHERE rc.status = 'COMPLETED')::int AS "completedRentals",
              COUNT(rc.id) FILTER (WHERE rc.status = 'CANCELLED')::int AS "cancelledRentals"
       FROM public.customers c
       LEFT JOIN rental.rental_contracts rc ON rc.customer_id = c.id
         AND rc.created_at >= $1 AND rc.created_at <= $2
       GROUP BY c.id, c.company_name
       ORDER BY "totalRentals" DESC, c.company_name ASC`,
      [from, to],
    );

    return NextResponse.json({ success: true, data: { customers: rows } });
  } catch (err) {
    console.error('[api/reports/customers]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
