import 'dotenv/config';
import { PrismaClient, UserRole, EquipmentStatus, RentalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const [manager, admin, sales, service] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manager@toolsact.co.th' },
      update: {},
      create: { name: 'สมชาย จันทร์ดี (Manager)', email: 'manager@toolsact.co.th', passwordHash, role: UserRole.MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'admin@toolsact.co.th' },
      update: {},
      create: { name: 'วิภา ศรีสุข (Admin)', email: 'admin@toolsact.co.th', passwordHash, role: UserRole.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: 'sales@toolsact.co.th' },
      update: {},
      create: { name: 'นภา สายใจ (Sales)', email: 'sales@toolsact.co.th', passwordHash, role: UserRole.SALES },
    }),
    prisma.user.upsert({
      where: { email: 'service@toolsact.co.th' },
      update: {},
      create: { name: 'ชาติชาย บุญมี (Service)', email: 'service@toolsact.co.th', passwordHash, role: UserRole.SERVICE },
    }),
  ]);
  console.log('✅ Users created:', [manager.email, admin.email, sales.email, service.email]);

  // ── Equipment ────────────────────────────────────────────────────────────
  const equipmentData = [
    { serialNumber: 'PC200-001', modelName: 'Komatsu PC200-8', category: 'Excavator', description: 'รถขุดขนาดกลาง 20 ตัน', conditionRating: 4 },
    { serialNumber: 'PC200-002', modelName: 'Komatsu PC200-8', category: 'Excavator', description: 'รถขุดขนาดกลาง 20 ตัน', conditionRating: 5 },
    { serialNumber: 'PC300-001', modelName: 'Komatsu PC300-8', category: 'Excavator', description: 'รถขุดขนาดใหญ่ 30 ตัน', conditionRating: 4 },
    { serialNumber: 'CS74-001', modelName: 'Dynapac CS74', category: 'Compactor', description: 'รถบดถนนล้อเหล็ก 7 ตัน', conditionRating: 3 },
    { serialNumber: 'CA250-001', modelName: 'Dynapac CA250', category: 'Compactor', description: 'รถบดดินล้อยาง 12 ตัน', conditionRating: 5 },
    { serialNumber: 'GEN150-001', modelName: 'Cummins 150kVA', category: 'Generator', description: 'เครื่องกำเนิดไฟฟ้า 150kVA', conditionRating: 4 },
    { serialNumber: 'GEN200-001', modelName: 'Cummins 200kVA', category: 'Generator', description: 'เครื่องกำเนิดไฟฟ้า 200kVA', conditionRating: 5 },
    { serialNumber: 'EX100-001', modelName: 'Hitachi EX100', category: 'Excavator', description: 'รถขุดขนาดเล็ก 10 ตัน', conditionRating: 4 },
    { serialNumber: 'DUMP-001', modelName: 'Isuzu FVZ Dump', category: 'Truck', description: 'รถดั้มพ์ 10 ล้อ', conditionRating: 3, status: EquipmentStatus.MAINTENANCE },
    { serialNumber: 'CRANE-001', modelName: 'Tadano TM300', category: 'Crane', description: 'เครนล้อยาง 30 ตัน', conditionRating: 4 },
  ];

  const equipment: any[] = [];
  for (const eq of equipmentData) {
    const existing = await prisma.equipment.findFirst({ where: { serialNumber: eq.serialNumber } });
    if (!existing) {
      equipment.push(await prisma.equipment.create({ data: eq }));
    } else {
      equipment.push(existing);
    }
  }
  console.log(`✅ ${equipment.length} equipment items created`);

  // ── Customers & Job Sites ─────────────────────────────────────────────────
  const customerData = [
    {
      companyName: 'บริษัท อิตาเลียนไทย ดีเวล็อปเมนต์ จำกัด',
      contactPerson: 'คุณวีรพล มีสุข',
      phone: '02-555-1234',
      email: 'procurement@itd.co.th',
      address: 'เลขที่ 2034/132-161 อาคารอิตัลไทย ถนนเพชรบุรีตัดใหม่ กรุงเทพฯ',
      taxId: '0107537001234',
      sites: [
        { siteName: 'โครงการ BTS สายสีส้ม', siteAddress: 'ถนนรามคำแหง เขตบึงกุ่ม กรุงเทพฯ', siteContactPerson: 'วิศวกรโสภณ', sitePhone: '081-234-5678' },
        { siteName: 'โครงการทางด่วนพระราม 3', siteAddress: 'ถนนพระราม 3 เขตบางคอแหลม กรุงเทพฯ', siteContactPerson: 'หัวหน้างานประจิน', sitePhone: '082-345-6789' },
      ],
    },
    {
      companyName: 'บริษัท ช.การช่าง จำกัด (มหาชน)',
      contactPerson: 'คุณสุรีย์ พลายงาม',
      phone: '02-678-4567',
      email: 'rental@chor.co.th',
      address: '587 ถนนสุทธิสาร เขตดินแดง กรุงเทพฯ 10400',
      taxId: '0107537009876',
      sites: [
        { siteName: 'โครงการนิคมอุตสาหกรรมอีสเทิร์น', siteAddress: 'ถนนสุขุมวิท อ.เมือง จ.ชลบุรี', siteContactPerson: 'ผู้จัดการโครงการบุญรักษ์', sitePhone: '083-456-7890' },
        { siteName: 'โครงการเขื่อนน้ำปาด', siteAddress: 'อ.น้ำปาด จ.อุตรดิตถ์', siteContactPerson: 'วิศวกรพุทธิพงศ์', sitePhone: '084-567-8901' },
      ],
    },
    {
      companyName: 'บริษัท ยูนิค เอ็นจิเนียริ่ง แอนด์ คอนสตรัคชั่น จำกัด',
      contactPerson: 'คุณมนัส อ่องแก้ว',
      phone: '02-789-5678',
      email: 'equipment@unique.co.th',
      address: '30/40 หมู่ 5 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540',
      taxId: '0107550011234',
      sites: [
        { siteName: 'โครงการ MRT สายสีเหลือง', siteAddress: 'ถนนลาดพร้าว เขตบางกะปิ กรุงเทพฯ', siteContactPerson: 'วิศวกรอนันต์', sitePhone: '085-678-9012' },
        { siteName: 'โครงการโรงไฟฟ้าระยอง', siteAddress: 'ต.มาบตาพุด อ.เมือง จ.ระยอง', siteContactPerson: 'หัวหน้างานสมบัติ', sitePhone: '086-789-0123' },
      ],
    },
  ];

  const customers: any[] = [];
  const jobSites: any[] = [];
  for (const cd of customerData) {
    const { sites, ...customerFields } = cd;
    let customer = await prisma.customer.findFirst({ where: { taxId: customerFields.taxId } });
    if (!customer) {
      customer = await prisma.customer.create({ data: customerFields });
    }
    customers.push(customer);

    for (const site of sites) {
      let js = await prisma.jobSite.findFirst({ where: { customerId: customer.id, siteName: site.siteName } });
      if (!js) {
        js = await prisma.jobSite.create({ data: { ...site, customerId: customer.id } });
      }
      jobSites.push(js);
    }
  }
  console.log(`✅ ${customers.length} customers and ${jobSites.length} job sites created`);

  // ── Rental Orders ─────────────────────────────────────────────────────────
  const today = new Date();
  const days = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const rentalDefs = [
    {
      rentalNumber: 'TA-20250101-0001',
      status: RentalStatus.ACTIVE,
      customerId: customers[0].id,
      jobSiteId: jobSites[0].id,
      equipmentId: equipment[0].id,
      rentalStartDate: days(-30),
      rentalEndDate: days(30),
      assignedSales: sales.id,
      assignedServiceIds: [service.id],
      specialConditions: 'ให้บริการล้างเครื่องทุก 250 ชั่วโมง',
    },
    {
      rentalNumber: 'TA-20250101-0002',
      status: RentalStatus.ORDER_RECEIVED,
      customerId: customers[1].id,
      jobSiteId: jobSites[2].id,
      equipmentId: equipment[3].id,
      rentalStartDate: days(5),
      rentalEndDate: days(65),
      assignedSales: sales.id,
    },
    {
      rentalNumber: 'TA-20250101-0003',
      status: RentalStatus.PREPARING,
      customerId: customers[2].id,
      jobSiteId: jobSites[4].id,
      equipmentId: equipment[5].id,
      rentalStartDate: days(2),
      rentalEndDate: days(32),
      assignedSales: sales.id,
      assignedServiceIds: [service.id],
    },
    {
      rentalNumber: 'TA-20250101-0004',
      status: RentalStatus.CLOSED,
      customerId: customers[0].id,
      jobSiteId: jobSites[1].id,
      equipmentId: equipment[1].id,
      rentalStartDate: days(-90),
      rentalEndDate: days(-30),
      actualReturnDate: days(-31),
      assignedSales: sales.id,
    },
    {
      rentalNumber: 'TA-20250101-0005',
      status: RentalStatus.CANCELLED,
      customerId: customers[1].id,
      jobSiteId: jobSites[3].id,
      equipmentId: equipment[6].id,
      rentalStartDate: days(-10),
      rentalEndDate: days(20),
      assignedSales: sales.id,
      specialConditions: 'ยกเลิกเนื่องจากลูกค้าเปลี่ยนแผนงาน',
    },
  ];

  for (const rd of rentalDefs) {
    const existing = await prisma.rentalOrder.findFirst({ where: { rentalNumber: rd.rentalNumber } });
    if (!existing) {
      const { assignedServiceIds, ...rest } = rd as any;
      await prisma.rentalOrder.create({
        data: {
          ...rest,
          createdBy: manager.id,
          assignedService: assignedServiceIds
            ? { connect: assignedServiceIds.map((id: string) => ({ id })) }
            : undefined,
        },
      });
    }
  }

  // Mark equipment[0] as RENTED (it's in ACTIVE rental)
  await prisma.equipment.update({ where: { id: equipment[0].id }, data: { status: EquipmentStatus.RENTED } });

  console.log(`✅ ${rentalDefs.length} rental orders created`);

  // ── Sample Inspection Report ──────────────────────────────────────────────
  const activeRental = await prisma.rentalOrder.findFirst({ where: { rentalNumber: 'TA-20250101-0001' } });
  if (activeRental) {
    const existingInsp = await prisma.inspectionReport.findFirst({ where: { rentalId: activeRental.id } });
    if (!existingInsp) {
      await prisma.inspectionReport.create({
        data: {
          rentalId: activeRental.id,
          type: 'DELIVERY',
          inspectedBy: service.id,
          inspectionDate: days(-30),
          checklistItems: [
            { itemName: 'เครื่องยนต์สตาร์ทได้ปกติ', status: 'PASS', note: '' },
            { itemName: 'ระบบไฮดรอลิคปกติ', status: 'PASS', note: '' },
            { itemName: 'บูมและก้านแขน', status: 'PASS', note: 'มีรอยขีดข่วนเล็กน้อย' },
            { itemName: 'ระดับน้ำมันเครื่อง', status: 'PASS', note: '' },
            { itemName: 'ยางสายพาน', status: 'PASS', note: '' },
          ],
          overallCondition: 4,
          damageNotes: 'สภาพดี พร้อมใช้งาน มีรอยขีดข่วนเล็กน้อยที่บูม',
          customerSignature: 'signed',
          photos: [],
        },
      });
      console.log('✅ Sample inspection report created');
    }
  }

  // ── Sample Maintenance Log ────────────────────────────────────────────────
  if (activeRental) {
    const existingLog = await prisma.maintenanceLog.findFirst({ where: { rentalId: activeRental.id } });
    if (!existingLog) {
      await prisma.maintenanceLog.create({
        data: {
          rentalId: activeRental.id,
          equipmentId: equipment[0].id,
          type: 'PM',
          performedBy: service.id,
          visitDate: days(-10),
          description: 'ตรวจเช็คระบบตามกำหนด 250 ชั่วโมง — เปลี่ยนน้ำมันเครื่องและกรอง',
          partsUsed: [
            { name: 'น้ำมันเครื่อง 15W-40', quantity: 20, cost: 1500 },
            { name: 'กรองน้ำมันเครื่อง', quantity: 1, cost: 350 },
          ],
          downtimeHours: 3,
        },
      });
      console.log('✅ Sample maintenance log created');
    }
  }

  console.log('🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Manager: manager@toolsact.co.th / password123');
  console.log('  Admin:   admin@toolsact.co.th   / password123');
  console.log('  Sales:   sales@toolsact.co.th   / password123');
  console.log('  Service: service@toolsact.co.th / password123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
