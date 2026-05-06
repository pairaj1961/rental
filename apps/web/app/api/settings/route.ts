import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── GET /api/settings ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT deposit_rate, late_fee_per_day, tax_rate, currency, company_name, updated_at
       FROM rental.rental_settings
       WHERE id = 'singleton'`,
    );

    const r = rows[0] ?? {};
    return NextResponse.json({
      data: {
        depositRate:    r.deposit_rate     ?? 20,
        lateFeePerDay:  r.late_fee_per_day ?? 500,
        taxRate:        r.tax_rate         ?? 7,
        currency:       r.currency         ?? 'THB',
        companyName:    r.company_name     ?? null,
        updatedAt:      r.updated_at?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[api/settings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /api/settings ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['SYSTEM_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const now  = new Date();

    const sets: string[]  = ['updated_at = $1'];
    const qp: unknown[]   = [now];
    const push = (v: unknown) => { qp.push(v); return `$${qp.length}`; };

    if (body.depositRate   != null) sets.push(`deposit_rate     = ${push(Number(body.depositRate))}`);
    if (body.lateFeePerDay != null) sets.push(`late_fee_per_day = ${push(Number(body.lateFeePerDay))}`);
    if (body.taxRate       != null) sets.push(`tax_rate         = ${push(Number(body.taxRate))}`);
    if (body.currency      != null) sets.push(`currency         = ${push(String(body.currency).trim())}`);
    if (body.companyName   != null) sets.push(`company_name     = ${push(body.companyName?.trim() ?? null)}`);

    if (sets.length === 1) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Ensure the singleton row exists with defaults, then UPDATE
    await pool.query(
      `INSERT INTO rental.rental_settings
         (id, deposit_rate, late_fee_per_day, tax_rate, currency, company_name, updated_at)
       VALUES ('singleton', 20, 500, 7, 'THB', NULL, $1)
       ON CONFLICT (id) DO NOTHING`,
      [now],
    );

    qp.push('singleton');
    await pool.query(
      `UPDATE rental.rental_settings SET ${sets.join(', ')} WHERE id = $${qp.length}`,
      qp,
    );

    const { rows } = await pool.query(
      `SELECT deposit_rate, late_fee_per_day, tax_rate, currency, company_name, updated_at
       FROM rental.rental_settings WHERE id = 'singleton'`,
    );
    const r = rows[0] ?? {};
    return NextResponse.json({
      data: {
        depositRate:    r.deposit_rate     ?? 20,
        lateFeePerDay:  r.late_fee_per_day ?? 500,
        taxRate:        r.tax_rate         ?? 7,
        currency:       r.currency         ?? 'THB',
        companyName:    r.company_name     ?? null,
        updatedAt:      r.updated_at?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[api/settings PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
