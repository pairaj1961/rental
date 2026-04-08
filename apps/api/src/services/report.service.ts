import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';

// Use a direct pg pool since Prisma models don't match the old report queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export async function getRentalSummary(app: FastifyInstance, from: Date, to: Date) {
  const { rows: byStatus } = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM rental.rental_contracts
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY status`,
    [from, to],
  );

  const { rows: rentals } = await pool.query(
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
  );

  const total = byStatus.reduce((s, r) => s + r.count, 0);
  const byStatusMap: Record<string, number> = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));
  const ACTIVE_STATUSES = ['ACTIVE', 'PENDING'];

  return {
    period: { from, to },
    total,
    active: ACTIVE_STATUSES.reduce((s, st) => s + (byStatusMap[st] ?? 0), 0),
    completed: byStatusMap['COMPLETED'] ?? 0,
    cancelled: byStatusMap['CANCELLED'] ?? 0,
    byStatus: byStatus.map((r) => ({ status: r.status, count: r.count })),
    rentals: rentals.map((r) => ({
      id: r.id,
      rentalNumber: r.rentalNumber,
      status: r.status,
      rentalStartDate: r.rentalStartDate,
      rentalEndDate: r.rentalEndDate,
      actualReturnDate: r.actualReturnDate,
      customer: { companyName: r.customerCompanyName },
      equipment: { modelName: null, category: null },
    })),
  };
}

export async function getEquipmentUsage(app: FastifyInstance, from: Date, to: Date) {
  const { rows } = await pool.query(
    `SELECT e.id, e.serial_number AS "serialNumber", e.asset_tag AS "assetTag",
            e.status, e.condition,
            p.model_name AS "modelName",
            b.name AS "brandName",
            COUNT(DISTINCT rci.contract_id)::int AS "rentalCount",
            COALESCE(SUM(
              EXTRACT(DAY FROM (
                LEAST(rc.end_date, $2) - GREATEST(rc.start_date, $1)
              ))
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

  const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

  return {
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
  };
}

export async function getCustomerReport(app: FastifyInstance, from: Date, to: Date) {
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

  return {
    customers: rows,
  };
}
