import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST /api/contracts/[id]/invoices
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = req.headers.get('x-user-role') ?? '';
  if (!['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: contractId } = await params;

  try {
    const body = await req.json();
    const { discount = 0, notes } = body ?? {};

    const { rows: cRows } = await pool.query(
      `SELECT status, total_amount FROM rental.rental_contracts WHERE id = $1`,
      [contractId],
    );
    if (!cRows[0]) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    if (!['ACTIVE', 'EXTENDED'].includes(cRows[0].status)) {
      return NextResponse.json({ error: 'Contract must be ACTIVE to create an invoice' }, { status: 400 });
    }

    const { rows: settRows } = await pool.query(
      `SELECT tax_rate FROM rental.rental_settings WHERE id = 'singleton'`,
    );
    const taxRate   = settRows[0]?.tax_rate ?? 7;
    const subtotal  = cRows[0].total_amount;
    const taxAmount = (subtotal - discount) * taxRate / 100;
    const total     = subtotal - discount + taxAmount;

    // Generate INV-YYYYMMDD-XXXX
    const now     = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*) FROM rental.rental_invoices WHERE invoice_number LIKE $1`,
      [`INV-${dateStr}-%`],
    );
    const seq           = parseInt(cntRows[0].count) + 1;
    const invoiceNumber = `INV-${dateStr}-${String(seq).padStart(4, '0')}`;

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceId = randomUUID();
    await pool.query(
      `INSERT INTO rental.rental_invoices
         (id, invoice_number, contract_id, invoice_date, due_date,
          subtotal, tax_rate, tax_amount, discount, total,
          status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DRAFT',$11,$12,$12)`,
      [
        invoiceId, invoiceNumber, contractId,
        now, dueDate,
        subtotal, taxRate, taxAmount, discount, total,
        notes?.trim() ?? null, now,
      ],
    );

    return NextResponse.json({
      data: {
        id: invoiceId, invoiceNumber,
        subtotal, taxRate, taxAmount, discount, total,
        status: 'DRAFT',
        invoiceDate: now.toISOString(),
        dueDate: dueDate.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[api/contracts/[id]/invoices POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
