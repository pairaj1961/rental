/**
 * Seed script for rental.* schema tables:
 * - rental_contracts (with items)
 * - delivery_schedules
 * - maintenance_records
 * - rental_invoices
 * - rental_settings
 *
 * Run: npx tsx prisma/seed-rental.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function cuid() {
  // simple enough for seeding
  return 'c' + Math.random().toString(36).slice(2, 13) + Math.random().toString(36).slice(2, 13);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding rental schema...');

    // ── Get existing users ──────────────────────────────────────────────────
    const { rows: users } = await client.query(`
      SELECT id, email, role FROM public.users ORDER BY created_at LIMIT 20
    `);

    const admin = users.find((u) => u.role === 'ADMIN') ?? users[0];
    const manager = users.find((u) => u.role === 'MANAGER') ?? users[0];
    const rep = users.find((u) => u.role === 'REP' || u.role === 'SALES_REP') ?? users[0];
    const pm = users.find((u) => u.role === 'PRODUCT_MANAGER') ?? users[0];

    console.log('Users found:', users.map((u) => `${u.email}(${u.role})`).join(', '));

    // ── Get existing customers ──────────────────────────────────────────────
    const { rows: customers } = await client.query(`
      SELECT id, company_name FROM public.customers LIMIT 10
    `);

    if (customers.length === 0) {
      console.log('⚠️  No customers found — run xCRM seed first (npm run db:seed in xcrm app)');
      return;
    }

    // ── Get existing products ───────────────────────────────────────────────
    const { rows: products } = await client.query(`
      SELECT id, model_name FROM public.products LIMIT 10
    `);

    // ── Settings ────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO rental.rental_settings (id, company_name, deposit_rate, late_fee_per_day, tax_rate, currency, updated_at)
      VALUES ('singleton', 'Tools Act Equipment Rental', 20, 500, 7, 'THB', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Rental settings created');

    // ── Equipment ───────────────────────────────────────────────────────────
    const equipmentDefs = [
      { serial: 'PC200-S001', asset: 'EQ-001', condition: 'GOOD',    status: 'AVAILABLE',   price: 2800000, product: products[0]?.id },
      { serial: 'PC200-S002', asset: 'EQ-002', condition: 'GOOD',    status: 'RENTED',      price: 2750000, product: products[0]?.id },
      { serial: 'PC300-S001', asset: 'EQ-003', condition: 'GOOD',    status: 'AVAILABLE',   price: 4200000, product: products[1]?.id },
      { serial: 'GEN150-001', asset: 'EQ-004', condition: 'FAIR',    status: 'AVAILABLE',   price:  950000, product: products[2]?.id },
      { serial: 'GEN200-001', asset: 'EQ-005', condition: 'GOOD',    status: 'AVAILABLE',   price: 1250000, product: products[2]?.id },
      { serial: 'DUMP-S001',  asset: 'EQ-006', condition: 'FAIR',    status: 'MAINTENANCE', price: 1800000, product: products[3]?.id },
      { serial: 'CRANE-S001', asset: 'EQ-007', condition: 'GOOD',    status: 'AVAILABLE',   price: 5500000, product: products[4]?.id },
      { serial: 'COMP-S001',  asset: 'EQ-008', condition: 'GOOD',    status: 'AVAILABLE',   price:  750000, product: products[5]?.id },
    ];

    const equipmentIds: Record<string, string> = {};
    for (const eq of equipmentDefs) {
      const { rows: existing } = await client.query(
        `SELECT id FROM rental.equipment WHERE serial_number = $1`, [eq.serial]
      );
      if (existing.length > 0) {
        equipmentIds[eq.serial] = existing[0].id;
        continue;
      }
      const id = cuid();
      equipmentIds[eq.serial] = id;
      await client.query(`
        INSERT INTO rental.equipment
          (id, product_id, serial_number, asset_tag, condition, status, purchase_price, is_active, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())
      `, [id, eq.product ?? cuid(), eq.serial, eq.asset, eq.condition, eq.status, eq.price]);
    }
    console.log(`✅ ${equipmentDefs.length} equipment items created`);

    const eq = equipmentIds; // shorthand

    // ── Helper: create contract ─────────────────────────────────────────────
    async function createContract(def: {
      number: string;
      customerId: string;
      repId: string;
      approvedById?: string;
      status: string;
      startDate: Date;
      endDate: Date;
      actualReturn?: Date;
      total: number;
      deposit: number;
      paymentStatus: string;
      notes?: string;
      quoteId?: string;
    }) {
      const { rows: ex } = await client.query(
        `SELECT id FROM rental.rental_contracts WHERE contract_number = $1`, [def.number]
      );
      if (ex.length > 0) return ex[0].id;

      const id = cuid();
      await client.query(`
        INSERT INTO rental.rental_contracts
          (id, contract_number, customer_id, assigned_rep_id, approved_by_id, status,
           start_date, end_date, actual_return_date, deposit_amount, total_amount,
           payment_status, converted_from_quote_id, notes, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      `, [
        id, def.number, def.customerId, def.repId, def.approvedById ?? null, def.status,
        def.startDate, def.endDate, def.actualReturn ?? null, def.deposit, def.total,
        def.paymentStatus, def.quoteId ?? null, def.notes ?? null,
      ]);
      return id;
    }

    // ── Helper: add contract item ───────────────────────────────────────────
    async function addItem(contractId: string, equipmentId: string, productId: string, qty: number, rate: number, rateType: string) {
      const subtotal = qty * rate;
      await client.query(`
        INSERT INTO rental.rental_contract_items
          (id, contract_id, equipment_id, product_id, quantity, agreed_rate, agreed_rate_type, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT DO NOTHING
      `, [cuid(), contractId, equipmentId, productId, qty, rate, rateType, subtotal]);
    }

    // ── Contracts ───────────────────────────────────────────────────────────
    const now = new Date();
    const d = (n: number) => new Date(now.getTime() + n * 86400000);
    const prodId = (serial: string) => products[0]?.id ?? cuid(); // fallback

    // 1. Active contract
    const c1 = await createContract({
      number: 'RC-2025-0001', customerId: customers[0].id, repId: rep?.id ?? admin.id,
      approvedById: manager?.id ?? admin.id, status: 'ACTIVE',
      startDate: d(-30), endDate: d(30), total: 180000, deposit: 36000,
      paymentStatus: 'PARTIAL', notes: 'ส่งมอบและตรวจสอบสภาพแล้ว',
    });
    await addItem(c1, eq['PC200-S002'], products[0]?.id ?? cuid(), 1, 90000, 'MONTHLY');

    // 2. Active contract 2
    const c2 = await createContract({
      number: 'RC-2025-0002', customerId: customers[1]?.id ?? customers[0].id, repId: rep?.id ?? admin.id,
      approvedById: admin.id, status: 'ACTIVE',
      startDate: d(-15), endDate: d(45), total: 95000, deposit: 19000,
      paymentStatus: 'PAID',
    });
    await addItem(c2, eq['GEN150-001'], products[2]?.id ?? cuid(), 1, 47500, 'MONTHLY');

    // 3. Pending contract
    const c3 = await createContract({
      number: 'RC-2025-0003', customerId: customers[2]?.id ?? customers[0].id, repId: rep?.id ?? admin.id,
      status: 'PENDING', startDate: d(5), endDate: d(65), total: 250000, deposit: 50000,
      paymentStatus: 'UNPAID',
    });
    await addItem(c3, eq['PC300-S001'], products[1]?.id ?? cuid(), 1, 125000, 'MONTHLY');

    // 4. Completed contract
    const c4 = await createContract({
      number: 'RC-2025-0004', customerId: customers[0].id, repId: rep?.id ?? admin.id,
      approvedById: admin.id, status: 'COMPLETED',
      startDate: d(-90), endDate: d(-30), actualReturn: d(-32),
      total: 270000, deposit: 54000, paymentStatus: 'PAID',
    });
    await addItem(c4, eq['PC200-S001'], products[0]?.id ?? cuid(), 1, 90000, 'MONTHLY');

    // 5. Overdue contract
    const c5 = await createContract({
      number: 'RC-2025-0005', customerId: customers[1]?.id ?? customers[0].id, repId: rep?.id ?? admin.id,
      approvedById: manager?.id ?? admin.id, status: 'ACTIVE',
      startDate: d(-60), endDate: d(-5), total: 165000, deposit: 33000,
      paymentStatus: 'PARTIAL', notes: 'ลูกค้าขอขยายสัญญา รอเอกสาร',
    });
    await addItem(c5, eq['CRANE-S001'], products[4]?.id ?? cuid(), 1, 165000, 'MONTHLY');

    console.log('✅ 5 rental contracts created');

    // ── Delivery Schedules ──────────────────────────────────────────────────
    const deliveries = [
      { contractId: c1, type: 'DELIVERY', date: d(-30), actual: d(-30), status: 'COMPLETED',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ', driver: 'สมศักดิ์ ใจดี', phone: '081-111-2222', plate: 'กข 1234' },
      { contractId: c2, type: 'DELIVERY', date: d(-15), actual: d(-15), status: 'COMPLETED',
        address: '456 ถนนรามคำแหง กรุงเทพฯ', driver: 'วิชัย มีสุข', phone: '082-222-3333', plate: 'ขค 5678' },
      { contractId: c3, type: 'DELIVERY', date: d(5), actual: null, status: 'SCHEDULED',
        address: '789 ถนนลาดพร้าว กรุงเทพฯ', driver: 'ประสิทธิ์ ดีใจ', phone: '083-333-4444', plate: 'คง 9012' },
      { contractId: c1, type: 'RETURN', date: d(30), actual: null, status: 'SCHEDULED',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ', driver: 'สมศักดิ์ ใจดี', phone: '081-111-2222', plate: 'กข 1234' },
      { contractId: c5, type: 'RETURN', date: d(-5), actual: null, status: 'OVERDUE',
        address: '321 ถนนพระราม 4 กรุงเทพฯ', driver: null, phone: null, plate: null },
      { contractId: c4, type: 'RETURN', date: d(-32), actual: d(-32), status: 'COMPLETED',
        address: '654 ถนนพระราม 3 กรุงเทพฯ', driver: 'วิชัย มีสุข', phone: '082-222-3333', plate: 'ขค 5678' },
    ];

    for (const del of deliveries) {
      const { rows: ex } = await client.query(
        `SELECT id FROM rental.delivery_schedules WHERE contract_id=$1 AND type=$2 AND scheduled_date=$3`,
        [del.contractId, del.type, del.date]
      );
      if (ex.length > 0) continue;
      await client.query(`
        INSERT INTO rental.delivery_schedules
          (id, contract_id, type, scheduled_date, actual_date, address, driver_name, driver_phone, vehicle_plate, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      `, [cuid(), del.contractId, del.type, del.date, del.actual, del.address,
          del.driver, del.phone, del.plate, del.status]);
    }
    console.log('✅ 6 delivery schedules created');

    // ── Maintenance Records ─────────────────────────────────────────────────
    const maintenance = [
      { equipId: eq['PC200-S002'], type: 'PREVENTIVE', sched: d(-10), done: d(-10),
        desc: 'PM 250 ชั่วโมง — เปลี่ยนน้ำมันเครื่องและกรอง', tech: 'ชาติชาย บุญมี',
        labor: 1500, parts: 1850, status: 'COMPLETED' },
      { equipId: eq['DUMP-S001'],  type: 'CORRECTIVE', sched: d(-5), done: null,
        desc: 'ซ่อมระบบไฮดรอลิค — ท่อรั่ว', tech: 'อนันต์ ซ่อมดี',
        labor: 3500, parts: 5200, status: 'IN_PROGRESS' },
      { equipId: eq['CRANE-S001'], type: 'PREVENTIVE', sched: d(7), done: null,
        desc: 'ตรวจเช็คประจำปี — ระบบยก', tech: 'ชาติชาย บุญมี',
        labor: 2000, parts: 0, status: 'SCHEDULED' },
      { equipId: eq['PC300-S001'], type: 'PREVENTIVE', sched: d(-20), done: d(-20),
        desc: 'PM 500 ชั่วโมง — เปลี่ยนกรองไฮดรอลิค', tech: 'อนันต์ ซ่อมดี',
        labor: 1800, parts: 2400, status: 'COMPLETED' },
      { equipId: eq['GEN150-001'], type: 'INSPECTION', sched: d(3), done: null,
        desc: 'ตรวจสอบก่อนส่งมอบ', tech: 'ชาติชาย บุญมี',
        labor: 500, parts: 0, status: 'SCHEDULED' },
    ];

    for (const m of maintenance) {
      const total = m.labor + m.parts;
      await client.query(`
        INSERT INTO rental.maintenance_records
          (id, equipment_id, type, scheduled_date, completed_date, description,
           technician_name, labor_cost, parts_cost, total_cost, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        ON CONFLICT DO NOTHING
      `, [cuid(), m.equipId, m.type, m.sched, m.done, m.desc,
          m.tech, m.labor, m.parts, total, m.status]);
    }
    console.log('✅ 5 maintenance records created');

    // ── Invoices ────────────────────────────────────────────────────────────
    const invoices = [
      { number: 'INV-2025-0001', contractId: c1, invDate: d(-30), dueDate: d(0),
        subtotal: 90000, tax: 6300, discount: 0, total: 96300, status: 'PAID',
        paidAt: d(-25), paidAmt: 96300 },
      { number: 'INV-2025-0002', contractId: c2, invDate: d(-15), dueDate: d(15),
        subtotal: 47500, tax: 3325, discount: 0, total: 50825, status: 'PAID',
        paidAt: d(-12), paidAmt: 50825 },
      { number: 'INV-2025-0003', contractId: c5, invDate: d(-60), dueDate: d(-30),
        subtotal: 82500, tax: 5775, discount: 0, total: 88275, status: 'OVERDUE',
        paidAt: null, paidAmt: null },
      { number: 'INV-2025-0004', contractId: c1, invDate: d(0), dueDate: d(30),
        subtotal: 90000, tax: 6300, discount: 0, total: 96300, status: 'SENT',
        paidAt: null, paidAmt: null },
      { number: 'INV-2025-0005', contractId: c4, invDate: d(-90), dueDate: d(-60),
        subtotal: 270000, tax: 18900, discount: 5000, total: 283900, status: 'PAID',
        paidAt: d(-58), paidAmt: 283900 },
      { number: 'INV-2025-0006', contractId: c3, invDate: d(5), dueDate: d(35),
        subtotal: 125000, tax: 8750, discount: 0, total: 133750, status: 'DRAFT',
        paidAt: null, paidAmt: null },
    ];

    for (const inv of invoices) {
      const { rows: ex } = await client.query(
        `SELECT id FROM rental.rental_invoices WHERE invoice_number=$1`, [inv.number]
      );
      if (ex.length > 0) continue;
      await client.query(`
        INSERT INTO rental.rental_invoices
          (id, invoice_number, contract_id, invoice_date, due_date, subtotal,
           tax_rate, tax_amount, discount, total, status, paid_at, paid_amount, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,7,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      `, [cuid(), inv.number, inv.contractId, inv.invDate, inv.dueDate,
          inv.subtotal, inv.tax, inv.discount, inv.total,
          inv.status, inv.paidAt, inv.paidAmt]);
    }
    console.log('✅ 6 invoices created');

    console.log('\n🎉 Rental seed complete!');
    console.log('\n📊 Summary:');
    console.log('  Equipment:     8 items (6 available, 1 rented, 1 maintenance)');
    console.log('  Contracts:     5 (2 active, 1 pending, 1 completed, 1 overdue)');
    console.log('  Deliveries:    6 schedules (2 upcoming, 2 completed, 1 overdue)');
    console.log('  Maintenance:   5 records (2 completed, 1 in-progress, 2 scheduled)');
    console.log('  Invoices:      6 (2 paid, 1 overdue, 1 sent, 1 draft, 1 paid)');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Seed error:', e.message);
  process.exit(1);
});
