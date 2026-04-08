import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

// ── GET /api/equipment ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status    = sp.get('status')    ?? '';
  const brand     = sp.get('brand')     ?? '';
  const condition = sp.get('condition') ?? '';
  const search    = sp.get('search')    ?? '';

  const conditions: string[] = ['e.is_active = true'];
  const params: unknown[] = [];

  const push = (val: unknown) => { params.push(val); return `$${params.length}`; };

  if (status)    conditions.push(`e.status = ${push(status)}`);
  if (brand)     conditions.push(`b.name = ${push(brand)}`);
  if (condition) conditions.push(`e.condition = ${push(condition)}`);
  if (search) {
    const p = push(`%${search}%`);
    conditions.push(`(p.model_name ILIKE ${p} OR e.serial_number ILIKE ${p} OR e.asset_tag ILIKE ${p})`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         e.id, e.asset_tag, e.serial_number, e.product_id,
         e.condition, e.status,
         e.purchase_date, e.purchase_price, e.current_location,
         e.notes, e.is_active, e.created_at, e.updated_at,
         p.model_name AS product_name, p.model_number, p.sku,
         p.rental_daily_rate, p.rental_weekly_rate, p.rental_monthly_rate,
         b.name AS brand_name,
         pc.name AS category_name
       FROM rental.equipment e
       JOIN public.products          p  ON p.id  = e.product_id
       JOIN public.brands            b  ON b.id  = p.brand_id
       JOIN public.product_categories pc ON pc.id = p.category_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.created_at DESC`,
      params,
    );

    return NextResponse.json({ data: rows.map(mapRow) });
  } catch (err) {
    console.error('[api/equipment GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/equipment ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      productId, serialNumber, assetTag,
      condition = 'GOOD',
      purchaseDate, purchasePrice,
      currentLocation, notes,
    } = body ?? {};

    if (!productId || !serialNumber?.trim()) {
      return NextResponse.json(
        { error: 'productId and serialNumber are required' },
        { status: 400 },
      );
    }

    const id  = randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO rental.equipment
         (id, product_id, serial_number, asset_tag, condition, status,
          purchase_date, purchase_price, current_location, notes,
          is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'AVAILABLE',$6,$7,$8,$9,true,$10,$10)`,
      [
        id, productId, serialNumber.trim(), assetTag?.trim() ?? null, condition,
        purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice ?? null,
        currentLocation?.trim() ?? null,
        notes?.trim() ?? null,
        now,
      ],
    );

    const { rows } = await pool.query(
      `SELECT e.id, e.asset_tag, e.serial_number, e.product_id,
              e.condition, e.status,
              e.purchase_date, e.purchase_price, e.current_location,
              e.notes, e.is_active, e.created_at, e.updated_at,
              p.model_name AS product_name, b.name AS brand_name, pc.name AS category_name
       FROM rental.equipment e
       JOIN public.products          p  ON p.id  = e.product_id
       JOIN public.brands            b  ON b.id  = p.brand_id
       JOIN public.product_categories pc ON pc.id = p.category_id
       WHERE e.id = $1`,
      [id],
    );

    return NextResponse.json({ data: mapRow(rows[0]) }, { status: 201 });
  } catch (err: any) {
    console.error('[api/equipment POST]', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Serial number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
function mapRow(r: any) {
  return {
    id:              r.id,
    assetTag:        r.asset_tag,
    serialNumber:    r.serial_number,
    productId:       r.product_id,
    productName:     r.product_name,
    brandName:       r.brand_name,
    categoryName:    r.category_name,
    rentalDailyRate:   r.rental_daily_rate,
    rentalWeeklyRate:  r.rental_weekly_rate,
    rentalMonthlyRate: r.rental_monthly_rate,
    condition:       r.condition,
    status:          r.status,
    purchaseDate:    r.purchase_date?.toISOString() ?? null,
    purchasePrice:   r.purchase_price,
    currentLocation: r.current_location,
    notes:           r.notes,
    isActive:        r.is_active,
    createdAt:       r.created_at?.toISOString(),
    updatedAt:       r.updated_at?.toISOString(),
  };
}
