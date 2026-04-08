/**
 * shared-db.ts
 *
 * Raw SQL helpers that query tables owned by xCRM (public schema).
 * These tables are NOT in rental's prisma/schema.prisma — they're queried
 * directly via the pg pool that's already used for auth.
 *
 * All queries explicitly prefix tables with "public." to be safe when
 * the connection's search_path is set to "rental".
 */

import { pool } from './db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SharedCustomer {
  id: string;
  companyName: string;
  tier: string | null;
  billingAddress: string | null;
  siteCount: number;
}

export interface SharedContact {
  id: string;
  siteId: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface SharedSite {
  id: string;
  customerId: string;
  siteName: string;
  siteType: string | null;
  address: string | null;
  province: string | null;
  country: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  isActive: boolean;
  contacts: SharedContact[];
}

export interface SharedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface SharedProduct {
  id: string;
  brandId: string;
  categoryId: string;
  sku: string | null;
  modelNumber: string | null;
  modelName: string;
  description: string | null;
  productType: string | null;
  rentalDailyRate: number;
  rentalWeeklyRate: number | null;
  rentalMonthlyRate: number | null;
  unit: string | null;
  brandName: string;
  categoryName: string;
}

export interface QuoteLineItem {
  id: string;
  productId: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface SharedQuote {
  id: string;
  leadId: string;
  quoteNumber: string;
  version: number;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  approvedById: string | null;
  leadTitle: string;
  siteId: string | null;
  lineItems: QuoteLineItem[];
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/** All active customers with a count of their associated sites. */
export async function getSharedCustomers(): Promise<SharedCustomer[]> {
  const { rows } = await pool.query<{
    id: string;
    company_name: string;
    tier: string | null;
    billing_address: string | null;
    site_count: string;
  }>(`
    SELECT
      c.id,
      c.company_name,
      c.tier,
      c.billing_address,
      COUNT(cs.id) AS site_count
    FROM public.customers c
    LEFT JOIN public.customer_sites cs ON cs.customer_id = c.id
    GROUP BY c.id, c.company_name, c.tier, c.billing_address
    ORDER BY c.company_name
  `);

  return rows.map((r) => ({
    id: r.id,
    companyName: r.company_name,
    tier: r.tier,
    billingAddress: r.billing_address,
    siteCount: parseInt(r.site_count, 10),
  }));
}

/** Sites for a single customer, each with their contacts. */
export async function getCustomerSites(customerId: string): Promise<SharedSite[]> {
  const [sitesResult, contactsResult] = await Promise.all([
    pool.query<{
      id: string;
      customer_id: string;
      site_name: string;
      site_type: string | null;
      address: string | null;
      province: string | null;
      country: string | null;
      project_start_date: Date | null;
      project_end_date: Date | null;
      is_active: boolean;
    }>(
      `SELECT id, customer_id, site_name, site_type, address, province, country,
              project_start_date, project_end_date, is_active
       FROM public.customer_sites
       WHERE customer_id = $1
       ORDER BY site_name`,
      [customerId],
    ),
    pool.query<{
      id: string;
      site_id: string;
      name: string;
      title: string | null;
      phone: string | null;
      email: string | null;
      is_primary: boolean;
    }>(
      `SELECT sc.id, sc.site_id, sc.name, sc.title, sc.phone, sc.email, sc.is_primary
       FROM public.site_contacts sc
       INNER JOIN public.customer_sites cs ON cs.id = sc.site_id
       WHERE cs.customer_id = $1
       ORDER BY sc.is_primary DESC, sc.name`,
      [customerId],
    ),
  ]);

  // Group contacts by site_id
  const contactsBySite = new Map<string, SharedContact[]>();
  for (const c of contactsResult.rows) {
    const list = contactsBySite.get(c.site_id) ?? [];
    list.push({
      id: c.id,
      siteId: c.site_id,
      name: c.name,
      title: c.title,
      phone: c.phone,
      email: c.email,
      isPrimary: c.is_primary,
    });
    contactsBySite.set(c.site_id, list);
  }

  return sitesResult.rows.map((s) => ({
    id: s.id,
    customerId: s.customer_id,
    siteName: s.site_name,
    siteType: s.site_type,
    address: s.address,
    province: s.province,
    country: s.country,
    projectStartDate: s.project_start_date?.toISOString() ?? null,
    projectEndDate: s.project_end_date?.toISOString() ?? null,
    isActive: s.is_active,
    contacts: contactsBySite.get(s.id) ?? [],
  }));
}

/** Active users, optionally filtered by role. */
export async function getSharedUsers(role?: string): Promise<SharedUser[]> {
  const params: string[] = [];
  let whereClause = 'WHERE is_active = true';
  if (role) {
    params.push(role);
    whereClause += ` AND role = $${params.length}`;
  }

  const { rows } = await pool.query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  }>(
    `SELECT id, first_name, last_name, email, role
     FROM public.users
     ${whereClause}
     ORDER BY first_name, last_name`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    role: r.role,
  }));
}

/** Active products that have a rental daily rate, with brand and category names. */
export async function getSharedProducts(): Promise<SharedProduct[]> {
  const { rows } = await pool.query<{
    id: string;
    brand_id: string;
    category_id: string;
    sku: string | null;
    model_number: string | null;
    model_name: string;
    description: string | null;
    product_type: string | null;
    rental_daily_rate: number;
    rental_weekly_rate: number | null;
    rental_monthly_rate: number | null;
    unit: string | null;
    brand_name: string;
    category_name: string;
  }>(`
    SELECT
      p.id, p.brand_id, p.category_id, p.sku, p.model_number, p.model_name,
      p.description, p.product_type,
      p.rental_daily_rate, p.rental_weekly_rate, p.rental_monthly_rate, p.unit,
      b.name  AS brand_name,
      pc.name AS category_name
    FROM public.products p
    JOIN public.brands b           ON b.id  = p.brand_id
    JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE p.rental_daily_rate > 0
      AND p.is_active = true
    ORDER BY pc.name, b.name, p.model_name
  `);

  return rows.map((r) => ({
    id: r.id,
    brandId: r.brand_id,
    categoryId: r.category_id,
    sku: r.sku,
    modelNumber: r.model_number,
    modelName: r.model_name,
    description: r.description,
    productType: r.product_type,
    rentalDailyRate: r.rental_daily_rate,
    rentalWeeklyRate: r.rental_weekly_rate,
    rentalMonthlyRate: r.rental_monthly_rate,
    unit: r.unit,
    brandName: r.brand_name,
    categoryName: r.category_name,
  }));
}

/** Approved quotes for a customer (via leads), with line items. */
export async function getApprovedQuotes(customerId: string): Promise<SharedQuote[]> {
  const { rows: quoteRows } = await pool.query<{
    id: string;
    lead_id: string;
    quote_number: string;
    version: number;
    status: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount: number;
    total: number;
    valid_until: Date | null;
    notes: string | null;
    approved_by_id: string | null;
    lead_title: string;
    site_id: string | null;
  }>(
    `SELECT
       q.id, q.lead_id, q.quote_number, q.version, q.status,
       q.subtotal, q.tax_rate, q.tax_amount, q.discount, q.total,
       q.valid_until, q.notes, q.approved_by_id,
       l.title AS lead_title,
       l.site_id
     FROM public.quotes q
     JOIN public.leads l ON l.id = q.lead_id
     WHERE l.customer_id = $1
       AND q.status = 'APPROVED'
     ORDER BY q.created_at DESC`,
    [customerId],
  );

  if (quoteRows.length === 0) return [];

  const quoteIds = quoteRows.map((q) => q.id);
  const { rows: lineRows } = await pool.query<{
    id: string;
    quote_id: string;
    product_id: string;
    description: string | null;
    qty: number;
    unit_price: number;
    discount: number;
    subtotal: number;
  }>(
    `SELECT id, quote_id, product_id, description, qty, unit_price, discount, subtotal
     FROM public.quote_line_items
     WHERE quote_id = ANY($1::text[])
     ORDER BY quote_id`,
    [quoteIds],
  );

  // Group line items by quote_id
  const linesByQuote = new Map<string, QuoteLineItem[]>();
  for (const li of lineRows) {
    const list = linesByQuote.get(li.quote_id) ?? [];
    list.push({
      id: li.id,
      productId: li.product_id,
      description: li.description,
      qty: li.qty,
      unitPrice: li.unit_price,
      discount: li.discount,
      subtotal: li.subtotal,
    });
    linesByQuote.set(li.quote_id, list);
  }

  return quoteRows.map((q) => ({
    id: q.id,
    leadId: q.lead_id,
    quoteNumber: q.quote_number,
    version: q.version,
    status: q.status,
    subtotal: q.subtotal,
    taxRate: q.tax_rate,
    taxAmount: q.tax_amount,
    discount: q.discount,
    total: q.total,
    validUntil: q.valid_until?.toISOString() ?? null,
    notes: q.notes,
    approvedById: q.approved_by_id,
    leadTitle: q.lead_title,
    siteId: q.site_id,
    lineItems: linesByQuote.get(q.id) ?? [],
  }));
}
