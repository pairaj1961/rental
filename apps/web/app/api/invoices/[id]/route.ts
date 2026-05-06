import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── PATCH /api/invoices/[id] ─────────────────────────────────────────────────
// Allowed transitions:
//   DRAFT   → SENT | VOID
//   SENT    → PAID | VOID | OVERDUE
//   OVERDUE → PAID | VOID
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status: newStatus, paidAmount, notes } = body ?? {};

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const { rows: cur } = await pool.query(
      `SELECT status, total FROM rental.rental_invoices WHERE id = $1`,
      [id],
    );
    if (!cur[0]) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const currentStatus = cur[0].status as string;

    const VALID: Record<string, string[]> = {
      DRAFT:   ['SENT', 'VOID'],
      SENT:    ['PAID', 'VOID', 'OVERDUE'],
      OVERDUE: ['PAID', 'VOID'],
      PAID:    [],
      VOID:    [],
    };

    if (!VALID[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition invoice from ${currentStatus} to ${newStatus}`,
      }, { status: 400 });
    }

    const now  = new Date();
    const sets = ['status = $1', 'updated_at = $2'];
    const qp: unknown[] = [newStatus, now];

    if (newStatus === 'PAID') {
      qp.push(paidAmount ?? cur[0].total);
      sets.push(`paid_amount = $${qp.length}`);
      qp.push(now);
      sets.push(`paid_at = $${qp.length}`);

      // Sync contract payment_status
      const contractRes = await pool.query(
        `SELECT rc.id FROM rental.rental_invoices ri
         JOIN rental.rental_contracts rc ON rc.id = ri.contract_id
         WHERE ri.id = $1`,
        [id],
      );
      if (contractRes.rows[0]) {
        await pool.query(
          `UPDATE rental.rental_contracts SET payment_status = 'PAID', updated_at = $1
           WHERE id = $2`,
          [now, contractRes.rows[0].id],
        );
      }
    }

    if (notes !== undefined) {
      qp.push(notes?.trim() ?? null);
      sets.push(`notes = $${qp.length}`);
    }

    qp.push(id);
    await pool.query(
      `UPDATE rental.rental_invoices SET ${sets.join(', ')} WHERE id = $${qp.length}`,
      qp,
    );

    return NextResponse.json({ data: { id, status: newStatus } });
  } catch (err) {
    console.error('[api/invoices/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
