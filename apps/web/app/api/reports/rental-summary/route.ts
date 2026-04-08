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
    const [{ rows: byStatus }, { rows: rentals }] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM rental.rental_contracts
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY status`,
        [from, to],
      ),
      pool.query(
        `SELECT rc.id, rc.contract_number AS "rentalNumber", rc.status,
                rc.start_date AS "rentalStartDate", rc.end_date AS "rentalEndDate",
                rc.actual_return_date AS "actualReturnDate",
                c.company_name AS "customerCompanyName"
         FROM rental.rental_contracts rc
         JOIN public.customers c ON c.id = rc.customer_id
         WHERE rc.created_at >= $1 AND rc.created_at <= $2
         ORDER BY rc.created_at DESC
         LIMIT 100`,
        [from, to],
      ),
    ]);

    const total = byStatus.reduce((s: number, r: any) => s + r.count, 0);
    const byStatusMap: Record<string, number> = Object.fromEntries(byStatus.map((r: any) => [r.status, r.count]));

    return NextResponse.json({
      success: true,
      data: {
        period: { from, to },
        total,
        active: (byStatusMap['ACTIVE'] ?? 0) + (byStatusMap['PENDING'] ?? 0),
        completed: byStatusMap['COMPLETED'] ?? 0,
        cancelled: byStatusMap['CANCELLED'] ?? 0,
        byStatus: byStatus.map((r: any) => ({ status: r.status, count: r.count })),
        rentals: rentals.map((r: any) => ({
          id: r.id,
          rentalNumber: r.rentalNumber,
          status: r.status,
          rentalStartDate: r.rentalStartDate,
          rentalEndDate: r.rentalEndDate,
          customer: { companyName: r.customerCompanyName },
          equipment: { modelName: null },
        })),
      },
    });
  } catch (err) {
    console.error('[api/reports/rental-summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
