import { createBasePdf, addHeader, addSection, addSignatureField, addFooter, savePdfToFile } from '../generator';

export async function generateRentalContract(
  data: {
    docNumber: string;
    rentalNumber: string;
    date: Date;
    customer: { companyName: string; contactPerson: string; phone: string; address?: string; taxId?: string };
    equipment: { modelName: string; serialNumber: string; category: string };
    jobSite: { siteName: string; siteAddress: string };
    rentalStart: Date;
    rentalEnd: Date;
    specialConditions?: string;
  },
  outputPath: string,
): Promise<void> {
  const doc = createBasePdf();
  addHeader(doc, 'Rental Contract / สัญญาเช่าเครื่องจักร', data.docNumber, data.date);

  addSection(doc, {
    title: 'Parties / คู่สัญญา',
    content: [
      { label: 'Lessor / ผู้ให้เช่า', value: 'บริษัท ทูลส์ แอคท์ จำกัด (Tools Act Co., Ltd.)' },
      { label: 'Lessee / ผู้เช่า', value: data.customer.companyName },
      { label: 'Tax ID / เลขภาษี', value: data.customer.taxId ?? '—' },
      { label: 'Contact / ผู้ติดต่อ', value: data.customer.contactPerson },
      { label: 'Phone / โทรศัพท์', value: data.customer.phone },
    ],
  });

  addSection(doc, {
    title: 'Equipment / เครื่องจักร',
    content: [
      { label: 'Model / รุ่น', value: data.equipment.modelName },
      { label: 'Serial No / หมายเลขเครื่อง', value: data.equipment.serialNumber },
      { label: 'Category / ประเภท', value: data.equipment.category },
    ],
  });

  addSection(doc, {
    title: 'Rental Period / ระยะเวลาเช่า',
    content: [
      { label: 'Contract No / เลขที่สัญญา', value: data.rentalNumber },
      { label: 'Start Date / วันเริ่มเช่า', value: formatDate(data.rentalStart) },
      { label: 'End Date / วันสิ้นสุด', value: formatDate(data.rentalEnd) },
      { label: 'Job Site / สถานที่', value: `${data.jobSite.siteName} — ${data.jobSite.siteAddress}` },
    ],
  });

  doc.fontSize(10).font('Helvetica-Bold').text('Terms and Conditions / ข้อกำหนดและเงื่อนไข');
  doc.moveDown(0.3);
  const terms = [
    '1. The Lessee agrees to use the equipment for the stated purpose only. / ผู้เช่าตกลงใช้เครื่องจักรตามวัตถุประสงค์ที่ระบุไว้เท่านั้น',
    '2. The Lessee is responsible for damage caused by misuse. / ผู้เช่ารับผิดชอบความเสียหายจากการใช้งานผิดวิธี',
    '3. Regular maintenance will be performed by the Lessor. / ผู้ให้เช่าจะดำเนินการบำรุงรักษาตามกำหนด',
    '4. Return of equipment must be in similar condition as delivered. / คืนเครื่องจักรในสภาพเดียวกับที่รับมอบ',
    '5. The Lessor reserves the right to retrieve the equipment if misused. / ผู้ให้เช่าสงวนสิทธิ์เรียกคืนเครื่องจักรหากมีการใช้งานผิดวัตถุประสงค์',
  ];
  for (const term of terms) {
    doc.fontSize(9).font('Helvetica').text(term, { indent: 10 });
    doc.moveDown(0.3);
  }

  if (data.specialConditions) {
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Special Conditions / เงื่อนไขพิเศษ');
    doc.fontSize(9).font('Helvetica').text(data.specialConditions);
  }

  doc.moveDown(2);
  addSignatureField(doc, 'Lessor / ผู้ให้เช่า', 50, doc.y);
  addSignatureField(doc, 'Lessee / ผู้เช่า', 310, doc.y);

  addFooter(doc);
  await savePdfToFile(doc, outputPath);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}
