import { createBasePdf, addHeader, addSection, addSignatureField, addFooter, savePdfToFile } from '../generator';

export async function generateReturnForm(
  data: {
    docNumber: string;
    rentalNumber: string;
    date: Date;
    customer: { companyName: string; contactPerson: string };
    equipment: { modelName: string; serialNumber: string };
    rentalStart: Date;
    actualReturn: Date;
    overallCondition: number;
    damageNotes?: string;
  },
  outputPath: string,
): Promise<void> {
  const doc = createBasePdf();
  addHeader(doc, 'Return Acceptance Form / ใบรับคืนเครื่องจักร', data.docNumber, data.date);

  addSection(doc, {
    title: 'Return Information / ข้อมูลการคืน',
    content: [
      { label: 'Rental No / เลขที่สัญญา', value: data.rentalNumber },
      { label: 'Customer / ลูกค้า', value: data.customer.companyName },
      { label: 'Contact / ผู้ติดต่อ', value: data.customer.contactPerson },
      { label: 'Equipment / เครื่องจักร', value: `${data.equipment.modelName} (${data.equipment.serialNumber})` },
      { label: 'Rental Start / เริ่มเช่า', value: formatDate(data.rentalStart) },
      { label: 'Return Date / วันคืน', value: formatDate(data.actualReturn) },
      { label: 'Final Condition / สภาพสุดท้าย', value: `${data.overallCondition}/5` },
    ],
  });

  if (data.damageNotes) {
    addSection(doc, {
      title: 'Damage Assessment / การประเมินความเสียหาย',
      content: [{ label: '', value: data.damageNotes }],
    });
  }

  doc.fontSize(9).font('Helvetica').text(
    'Both parties confirm that the above equipment has been returned and inspected. / '
    + 'คู่สัญญาทั้งสองฝ่ายยืนยันว่าเครื่องจักรดังกล่าวได้รับคืนและตรวจสอบแล้ว',
  );

  doc.moveDown(2);
  addSignatureField(doc, 'Service Team / ทีมรับคืน', 50, doc.y);
  addSignatureField(doc, 'Customer / ลูกค้า', 310, doc.y);

  addFooter(doc);
  await savePdfToFile(doc, outputPath);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}
