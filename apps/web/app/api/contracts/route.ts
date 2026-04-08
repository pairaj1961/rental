import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

// ── GET /api/contracts ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status     = searchParams.get('status');
  const assignedRep = searchParams.get('assignedRep');
  const dateFrom   = searchParams.get('dateFrom');
  const dateTo     = searchParams.get('dateTo');
  const search     = searchParams.get('search');

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (status) {
    params.push(status);
    conditions.push(`rc.status = $${params.length}`);
  }
  if (assignedRep) {
    params.push(assignedRep);
    conditions.push(`rc.assigned_rep_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(new Date(dateFrom));
    conditions.push(`rc.start_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(new Date(dateTo));
    conditions.push(`rc.end_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(rc.contract_number ILIKE $${n} OR c.company_name ILIKE $${n})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT rc.id, rc.contract_number, rc.status, rc.payment_status,
              rc.start_date, rc.end_date, rc.total_amount, rc.deposit_amount,
              rc.created_at, rc.assigned_rep_id,
              c.company_name AS customer_name,
              cs.site_name,
              u.first_name || ' ' || u.last_name AS assigned_rep_name
       FROM rental.rental_contracts rc
       JOIN public.customers c ON c.id = rc.customer_id
       LEFT JOIN public.customer_sites cs ON cs.id = rc.site_id
       LEFT JOIN public.users u ON u.id = rc.assigned_rep_id
       ${where}
       ORDER BY rc.created_at DESC
       LIMIT 200`,
      params,
    );

    return NextResponse.json({
      data: rows.map((r) => ({
        id:              r.id,
        contractNumber:  r.contract_number,
        status:          r.status,
        paymentStatus:   r.payment_status,
        startDate:       r.start_date?.toISOString() ?? null,
        endDate:         r.end_date?.toISOString() ?? null,
        totalAmount:     r.total_amount,
        depositAmount:   r.deposit_amount,
        createdAt:       r.created_at?.toISOString(),
        customerName:    r.customer_name,
        siteName:        r.site_name,
        assignedRepName: r.assigned_rep_name,
        assignedRepId:   r.assigned_rep_id,
      })),
    });
  } catch (err) {
    console.error('[api/contracts GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/contracts ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'REP', 'SALES_REP'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      customerId, siteId, assignedRepId, convertedFromQuoteId,
      items, // [{ equipmentId, agreedRate, agreedRateType, notes? }]
      startDate, endDate, depositAmount, notes,
    } = body ?? {};

    if (!customerId || !assignedRepId || !startDate || !endDate || !items?.length) {
      return NextResponse.json({
        error: 'customerId, assignedRepId, startDate, endDate, and items are required',
      }, { status: 400 });
    }

    // Generate contract number RC-YYYYMMDD-XXXX
    const now     = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*) FROM rental.rental_contracts WHERE contract_number LIKE $1`,
      [`RC-${dateStr}-%`],
    );
    const seq            = parseInt(cntRows[0].count) + 1;
    const contractNumber = `RC-${dateStr}-${String(seq).padStart(4, '0')}`;

    const startDateObj = new Date(startDate);
    const endDateObj   = new Date(endDate);
    const totalDays    = Math.max(1, Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    ));

    // Verify equipment and enrich items
    type EnrichedItem = {
      equipmentId: string; productId: string;
      agreedRate: number; agreedRateType: string;
      subtotal: number; notes?: string;
    };
    const enrichedItems: EnrichedItem[] = [];

    for (const item of items) {
      const { rows } = await pool.query(
        `SELECT id, product_id FROM rental.equipment WHERE id = $1 AND is_active = true`,
        [item.equipmentId],
      );
      if (!rows[0]) {
        return NextResponse.json({ error: `Equipment ${item.equipmentId} not found` }, { status: 404 });
      }
      let subtotal = 0;
      if (item.agreedRateType === 'DAILY')        subtotal = item.agreedRate * totalDays;
      else if (item.agreedRateType === 'WEEKLY')  subtotal = item.agreedRate * Math.ceil(totalDays / 7);
      else if (item.agreedRateType === 'MONTHLY') subtotal = item.agreedRate * Math.ceil(totalDays / 30);
      enrichedItems.push({ ...item, productId: rows[0].product_id, subtotal });
    }

    const totalAmount = enrichedItems.reduce((s, i) => s + i.subtotal, 0);

    // Get deposit rate from settings
    const { rows: settRows } = await pool.query(
      `SELECT deposit_rate FROM rental.rental_settings WHERE id = 'singleton'`,
    );
    const depositRate    = settRows[0]?.deposit_rate ?? 20;
    const computedDeposit = depositAmount != null ? depositAmount : (totalAmount * depositRate / 100);

    const id = randomUUID();
    await pool.query(
      `INSERT INTO rental.rental_contracts
         (id, contract_number, customer_id, site_id, assigned_rep_id,
          converted_from_quote_id, status, start_date, end_date,
          deposit_amount, total_amount, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8,$9,$10,$11,$12,$12)`,
      [
        id, contractNumber, customerId, siteId ?? null, assignedRepId,
        convertedFromQuoteId ?? null,
        startDateObj, endDateObj,
        computedDeposit, totalAmount,
        notes?.trim() ?? null,
        now,
      ],
    );

    for (const item of enrichedItems) {
      await pool.query(
        `INSERT INTO rental.rental_contract_items
           (id, contract_id, equipment_id, product_id, quantity,
            agreed_rate, agreed_rate_type, subtotal, notes)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8)`,
        [
          randomUUID(), id, item.equipmentId, item.productId,
          item.agreedRate, item.agreedRateType, item.subtotal,
          item.notes?.trim() ?? null,
        ],
      );
    }

    return NextResponse.json({ data: { id, contractNumber } }, { status: 201 });
  } catch (err) {
    console.error('[api/contracts POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
