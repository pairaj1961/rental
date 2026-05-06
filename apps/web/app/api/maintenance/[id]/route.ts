import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── PATCH /api/maintenance/[id] ───────────────────────────────────────────────
// Transitions: SCHEDULED → IN_PROGRESS → COMPLETED | CANCELLED
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
    const {
      status: newStatus,
      completedDate,
      description,
      technicianName,
      laborCost,
      partsCost,
      notes,
    } = body ?? {};

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const { rows: cur } = await pool.query(
      `SELECT status FROM rental.maintenance_records WHERE id = $1`,
      [id],
    );
    if (!cur[0]) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const currentStatus = cur[0].status as string;

    const VALID: Record<string, string[]> = {
      SCHEDULED:   ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED:   [],
      CANCELLED:   [],
    };

    if (!VALID[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition from ${currentStatus} to ${newStatus}`,
      }, { status: 400 });
    }

    const now  = new Date();
    const sets = ['status = $1'];
    const qp: unknown[] = [newStatus];

    if (newStatus === 'COMPLETED') {
      qp.push(completedDate ? new Date(completedDate) : now);
      sets.push(`completed_date = $${qp.length}`);
    }
    if (description  !== undefined) { qp.push(description?.trim()    ?? null); sets.push(`description     = $${qp.length}`); }
    if (technicianName !== undefined) { qp.push(technicianName?.trim() ?? null); sets.push(`technician_name = $${qp.length}`); }
    const newLabor = laborCost  !== undefined ? (Number(laborCost)  || 0) : undefined;
    const newParts = partsCost  !== undefined ? (Number(partsCost)  || 0) : undefined;

    if (newLabor !== undefined) { qp.push(newLabor); sets.push(`labor_cost = $${qp.length}`); }
    if (newParts !== undefined) { qp.push(newParts); sets.push(`parts_cost = $${qp.length}`); }
    if (notes    !== undefined) { qp.push(notes?.trim() ?? null); sets.push(`notes = $${qp.length}`); }

    // Compute total_cost in TypeScript so SET uses the new values
    if (newLabor !== undefined || newParts !== undefined) {
      // We need to fetch the current values for whichever cost wasn't provided
      if (newLabor === undefined || newParts === undefined) {
        const { rows: curCosts } = await pool.query(
          `SELECT labor_cost, parts_cost FROM rental.maintenance_records WHERE id = $1`, [id],
        );
        const cl = curCosts[0]?.labor_cost ?? 0;
        const cp = curCosts[0]?.parts_cost ?? 0;
        const total = (newLabor ?? cl) + (newParts ?? cp);
        qp.push(total);
      } else {
        qp.push(newLabor + newParts);
      }
      sets.push(`total_cost = $${qp.length}`);
    }

    qp.push(id);
    await pool.query(
      `UPDATE rental.maintenance_records SET ${sets.join(', ')} WHERE id = $${qp.length}`,
      qp,
    );

    // When completing, sync equipment status back to AVAILABLE (if it was MAINTENANCE)
    if (newStatus === 'COMPLETED') {
      await pool.query(
        `UPDATE rental.equipment SET status = 'AVAILABLE', updated_at = $1
         WHERE id = (SELECT equipment_id FROM rental.maintenance_records WHERE id = $2)
           AND status = 'MAINTENANCE'`,
        [now, id],
      );
    }

    return NextResponse.json({ data: { id, status: newStatus } });
  } catch (err) {
    console.error('[api/maintenance/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
