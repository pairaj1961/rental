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

  const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.serial_number AS "serialNumber", e.asset_tag AS "assetTag",
              e.status, e.condition,
              p.model_name AS "modelName",
              b.name AS "brandName",
              COUNT(DISTINCT rci.contract_id)::int AS "rentalCount",
              COALESCE(SUM(
                GREATEST(0, EXTRACT(DAY FROM (
                  LEAST(rc.end_date, $2::timestamptz) - GREATEST(rc.start_date, $1::timestamptz)
                )))
              ), 0)::int AS "totalDays"
       FROM rental.equipment e
       LEFT JOIN public.products p ON p.id = e.product_id
       LEFT JOIN public.brands b ON b.id = p.brand_id
       LEFT JOIN rental.rental_contract_items rci ON rci.equipment_id = e.id
       LEFT JOIN rental.rental_contracts rc ON rc.id = rci.contract_id
         AND rc.status NOT IN ('CANCELLED', 'DRAFT')
         AND rc.start_date <= $2 AND rc.end_date >= $1
       WHERE e.is_active = true
       GROUP BY e.id, p.model_name, b.name
       ORDER BY "rentalCount" DESC`,
      [from, to],
    );

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          modelName: r.modelName ?? r.serialNumber,
          serialNumber: r.serialNumber,
          assetTag: r.assetTag,
          brandName: r.brandName,
          status: r.status,
          rentalCount: r.rentalCount,
          totalDays: r.totalDays,
          utilizationRate: periodDays > 0 ? Math.round((r.totalDays / periodDays) * 100) : 0,
        })),
      },
    });
  } catch (err) {
    console.error('[api/reports/equipment-usage]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
