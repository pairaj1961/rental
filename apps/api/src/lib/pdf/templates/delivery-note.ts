import { createBasePdf, addHeader, addSection, addSignatureField, addFooter, savePdfToFile } from '../generator';

export async function generateDeliveryNote(
  data: {
    docNumber: string;
    rentalNumber: string;
    date: Date;
    customer: { companyName: string; contactPerson: string; phone: string; address?: string };
    jobSite: { siteName: string; siteAddress: string; siteContactPerson?: string; sitePhone?: string };
    equipment: { modelName: string; serialNumber: string; category: string; conditionRating: number };
    rentalStart: Date;
    rentalEnd: Date;
    serviceTeam: string;
    specialConditions?: string;
  },
  outputPath: string,
): Promise<void> {
  const doc = createBasePdf();
  addHeader(doc, 'Delivery Note / ใบส่งมอบเครื่องจักร', data.docNumber, data.date);

  addSection(doc, {
    title: 'Rental Information / ข้อมูลการเช่า',
    content: [
      { label: 'Rental No / เลขที่สัญญาเช่า', value: data.rentalNumber },
      { label: 'Start Date / วันเริ่มเช่า', value: formatDate(data.rentalStart) },
      { label: 'End Date / วันสิ้นสุด', value: formatDate(data.rentalEnd) },
    ],
  });

  addSection(doc, {
    title: 'Customer Information / ข้อมูลลูกค้า',
    content: [
      { label: 'Company / บริษัท', value: data.customer.companyName },
      { label: 'Contact / ผู้ติดต่อ', value: data.customer.contactPerson },
      { label: 'Phone / โทรศัพท์', value: data.customer.phone },
      { label: 'Address / ที่อยู่', value: data.customer.address ?? '—' },
    ],
  });

  addSection(doc, {
    title: 'Job Site / สถานที่ติดตั้ง',
    content: [
      { label: 'Site Name / ชื่อโครงการ', value: data.jobSite.siteName },
      { label: 'Address / ที่อยู่', value: data.jobSite.siteAddress },
      { label: 'Site Contact / ผู้ดูแล', value: data.jobSite.siteContactPerson ?? '—' },
      { label: 'Site Phone / โทรโครงการ', value: data.jobSite.sitePhone ?? '—' },
    ],
  });

  addSection(doc, {
    title: 'Equipment Details / รายละเอียดเครื่องจักร',
    content: [
      { label: 'Model / รุ่น', value: data.equipment.modelName },
      { label: 'Serial No / หมายเลขเครื่อง', value: data.equipment.serialNumber },
      { label: 'Category / ประเภท', value: data.equipment.category },
      { label: 'Condition / สภาพ', value: `${data.equipment.conditionRating}/5` },
    ],
  });

  if (data.specialConditions) {
    addSection(doc, {
      title: 'Special Conditions / เงื่อนไขพิเศษ',
      content: [{ label: '', value: data.specialConditions }],
    });
  }

  doc.moveDown(2);
  addSignatureField(doc, 'Service Team / ทีมส่งมอบ', 50, doc.y);
  addSignatureField(doc, 'Customer / ลูกค้า', 310, doc.y);

  addFooter(doc);
  await savePdfToFile(doc, outputPath);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}
