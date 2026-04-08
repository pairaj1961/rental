import { createBasePdf, addHeader, addSection, addSignatureField, addFooter, savePdfToFile } from '../generator';
import { ChecklistItem } from '@rental/shared';

export async function generateInspectionForm(
  data: {
    docNumber: string;
    rentalNumber: string;
    date: Date;
    type: string;
    equipment: { modelName: string; serialNumber: string };
    inspector: string;
    checklistItems: ChecklistItem[];
    overallCondition: number;
    damageNotes?: string;
  },
  outputPath: string,
): Promise<void> {
  const doc = createBasePdf();
  const typeLabel = data.type === 'PRE_DELIVERY' ? 'Pre-Delivery Inspection / ตรวจสอบก่อนส่งมอบ'
    : data.type === 'DELIVERY' ? 'Delivery Inspection / ตรวจสอบส่งมอบ'
    : 'Return Inspection / ตรวจสอบรับคืน';

  addHeader(doc, `Equipment Condition Form\n${typeLabel}`, data.docNumber, data.date);

  addSection(doc, {
    title: 'Details / รายละเอียด',
    content: [
      { label: 'Rental No / เลขที่สัญญา', value: data.rentalNumber },
      { label: 'Equipment / เครื่องจักร', value: `${data.equipment.modelName} (${data.equipment.serialNumber})` },
      { label: 'Inspector / ผู้ตรวจ', value: data.inspector },
      { label: 'Overall Condition / สภาพรวม', value: `${data.overallCondition}/5` },
    ],
  });

  // Checklist table
  doc.fontSize(11).font('Helvetica-Bold').text('Checklist / รายการตรวจสอบ');
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.rect(50, tableTop, 300, 18).fill('#f0f0f0').stroke();
  doc.rect(350, tableTop, 80, 18).fill('#f0f0f0').stroke();
  doc.rect(430, tableTop, 115, 18).fill('#f0f0f0').stroke();
  doc.fillColor('#000000');
  doc.text('Item / รายการ', 55, tableTop + 4, { width: 290 });
  doc.text('Status / สถานะ', 355, tableTop + 4, { width: 70 });
  doc.text('Note / หมายเหตุ', 435, tableTop + 4, { width: 105 });

  let y = tableTop + 18;
  for (const item of data.checklistItems) {
    const rowHeight = 18;
    const statusColor = item.status === 'PASS' ? '#00c875' : item.status === 'FAIL' ? '#e44258' : '#c4c4c4';
    doc.font('Helvetica').fillColor('#000000').fontSize(8);
    doc.text(item.itemName, 55, y + 4, { width: 290 });
    doc.fillColor(statusColor).text(item.status, 355, y + 4, { width: 70 });
    doc.fillColor('#000000').text(item.note ?? '', 435, y + 4, { width: 105 });
    doc.rect(50, y, 495, rowHeight).stroke();
    y += rowHeight;
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }
  }

  doc.y = y + 10;

  if (data.damageNotes) {
    addSection(doc, {
      title: 'Damage Notes / บันทึกความเสียหาย',
      content: [{ label: '', value: data.damageNotes }],
    });
  }

  doc.moveDown(2);
  addSignatureField(doc, 'Inspector / ผู้ตรวจสอบ', 50, doc.y);
  addSignatureField(doc, 'Customer / ลูกค้า', 310, doc.y);

  addFooter(doc);
  await savePdfToFile(doc, outputPath);
}
