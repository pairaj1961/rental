import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST /api/maintenance — schedule a maintenance record for a piece of equipment
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'PRODUCTION_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { equipmentId, type = 'PREVENTIVE', scheduledDate, description, technicianName } = body ?? {};

    if (!equipmentId || !scheduledDate) {
      return NextResponse.json({ error: 'equipmentId and scheduledDate are required' }, { status: 400 });
    }

    // Verify equipment exists
    const { rows: eqCheck } = await pool.query(
      `SELECT id FROM rental.equipment WHERE id = $1 AND is_active = true`,
      [equipmentId],
    );
    if (!eqCheck[0]) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const id  = randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO rental.maintenance_records
         (id, equipment_id, type, scheduled_date, description,
          technician_name, labor_cost, parts_cost, total_cost, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,0,0,0,'SCHEDULED',$7)`,
      [
        id, equipmentId, type, new Date(scheduledDate),
        description?.trim() ?? null,
        technicianName?.trim() ?? null,
        now,
      ],
    );

    return NextResponse.json({
      data: { id, equipmentId, type, scheduledDate, status: 'SCHEDULED' },
    }, { status: 201 });
  } catch (err) {
    console.error('[api/maintenance POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
