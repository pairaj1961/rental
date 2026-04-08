import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status   = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo   = searchParams.get('dateTo');
  const search   = searchParams.get('search');

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (status)   { params.push(status);             conditions.push(`ri.status = $${params.length}`); }
  if (dateFrom) { params.push(new Date(dateFrom)); conditions.push(`ri.invoice_date >= $${params.length}`); }
  if (dateTo)   { params.push(new Date(dateTo));   conditions.push(`ri.due_date <= $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(ri.invoice_number ILIKE $${n} OR rc.contract_number ILIKE $${n} OR c.company_name ILIKE $${n})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT ri.id, ri.invoice_number, ri.contract_id, ri.status,
              ri.invoice_date, ri.due_date, ri.subtotal, ri.tax_rate,
              ri.tax_amount, ri.discount, ri.total, ri.paid_at, ri.paid_amount,
              ri.created_at,
              rc.contract_number,
              c.company_name AS customer_name
       FROM rental.rental_invoices ri
       JOIN rental.rental_contracts rc ON rc.id = ri.contract_id
       JOIN public.customers c ON c.id = rc.customer_id
       ${where}
       ORDER BY ri.invoice_date DESC
       LIMIT 200`,
      params,
    );

    return NextResponse.json({
      data: rows.map((r) => ({
        id:             r.id,
        invoiceNumber:  r.invoice_number,
        contractId:     r.contract_id,
        contractNumber: r.contract_number,
        customerName:   r.customer_name,
        status:         r.status,
        invoiceDate:    r.invoice_date?.toISOString() ?? null,
        dueDate:        r.due_date?.toISOString() ?? null,
        subtotal:       r.subtotal,
        taxRate:        r.tax_rate,
        taxAmount:      r.tax_amount,
        discount:       r.discount,
        total:          r.total,
        paidAt:         r.paid_at?.toISOString() ?? null,
        paidAmount:     r.paid_amount,
        createdAt:      r.created_at?.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[api/invoices GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
