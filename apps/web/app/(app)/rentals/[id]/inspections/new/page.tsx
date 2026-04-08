'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRental } from '@/hooks/useRentals';
import { useCreateInspection, ChecklistItemInput } from '@/hooks/useInspections';
import { InspectionType } from '@rental/shared';
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CHECKLISTS: Record<InspectionType, string[]> = {
  [InspectionType.PRE_DELIVERY]: [
    'Engine oil level / ระดับน้ำมันเครื่อง',
    'Hydraulic oil level / น้ำมันไฮดรอลิก',
    'Coolant level / น้ำหล่อเย็น',
    'Fuel level / ระดับน้ำมันเชื้อเพลิง',
    'Battery condition / แบตเตอรี่',
    'Tracks / tyres condition / สายพาน/ยาง',
    'Bucket / attachment condition / บุ้งกี๋/อุปกรณ์',
    'Lights & signals / ไฟและสัญญาณ',
    'Safety devices / อุปกรณ์ความปลอดภัย',
    'Leaks check / การรั่วซึม',
    'Seat & controls / เบาะและคันบังคับ',
    'Fire extinguisher / ถังดับเพลิง',
  ],
  [InspectionType.DELIVERY]: [
    'Machine condition on arrival / สภาพเครื่องเมื่อถึงหน้างาน',
    'Hydraulic functions / ระบบไฮดรอลิก',
    'Engine starts & runs / เครื่องยนต์',
    'All attachments present / อุปกรณ์ครบ',
    'Tracks / tyres / สายพาน/ยาง',
    'Lights & alarms / ไฟและสัญญาณเตือน',
    'Safety devices / อุปกรณ์ความปลอดภัย',
    'No visible damage / ไม่มีความเสียหายที่มองเห็น',
    'Customer training completed / ลูกค้าได้รับการฝึกอบรม',
    'Operating manual handed over / คู่มือการใช้งาน',
  ],
  [InspectionType.RETURN]: [
    'Engine condition / สภาพเครื่องยนต์',
    'Hydraulic system / ระบบไฮดรอลิก',
    'Undercarriage / ชุดเดินรถ',
    'Bucket / attachment / บุ้งกี๋/อุปกรณ์',
    'Body panels / แผงตัวถัง',
    'Lights & electrics / ไฟและระบบไฟฟ้า',
    'Fluid levels / ระดับของเหลว',
    'Damage assessment / ประเมินความเสียหาย',
    'Cleanliness / ความสะอาด',
    'All accessories returned / อุปกรณ์เสริมครบ',
  ],
};

type ItemStatus = 'PASS' | 'FAIL' | 'NA';

interface LocalChecklistItem {
  itemName: string;
  status: ItemStatus;
  note: string;
}

export default function NewInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: rental } = useRental(id);
  const createInspection = useCreateInspection(id);

  const [type, setType] = useState<InspectionType>(InspectionType.PRE_DELIVERY);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallCondition, setOverallCondition] = useState(5);
  const [damageNotes, setDamageNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState(false);
  const [items, setItems] = useState<LocalChecklistItem[]>(() =>
    DEFAULT_CHECKLISTS[InspectionType.PRE_DELIVERY].map((name) => ({
      itemName: name,
      status: 'NA',
      note: '',
    }))
  );
  const [newItemName, setNewItemName] = useState('');

  const handleTypeChange = (newType: InspectionType) => {
    setType(newType);
    setItems(DEFAULT_CHECKLISTS[newType].map((name) => ({ itemName: name, status: 'NA', note: '' })));
  };

  const setItemStatus = (idx: number, status: ItemStatus) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, status } : item));
  };

  const setItemNote = (idx: number, note: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, note } : item));
  };

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { itemName: name, status: 'NA', note: '' }]);
    setNewItemName('');
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!inspectionDate) { toast.error('Please select an inspection date'); return; }
    if (items.length === 0) { toast.error('Add at least one checklist item'); return; }

    const checklistItems: ChecklistItemInput[] = items.map((item) => ({
      itemName: item.itemName,
      status: item.status,
      note: item.note || undefined,
    }));

    try {
      await createInspection.mutateAsync({
        type,
        inspectionDate,
        checklistItems,
        overallCondition,
        damageNotes: damageNotes || undefined,
        customerSignature,
      });
      toast.success('Inspection report saved');
      router.push(`/rentals/${id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save inspection');
    }
  };

  const passCount = items.filter((i) => i.status === 'PASS').length;
  const failCount = items.filter((i) => i.status === 'FAIL').length;
  const naCount = items.filter((i) => i.status === 'NA').length;

  const TYPE_LABELS: Record<InspectionType, string> = {
    [InspectionType.PRE_DELIVERY]: 'Pre-Delivery / ก่อนส่งมอบ',
    [InspectionType.DELIVERY]: 'Delivery Handover / ส่งมอบ',
    [InspectionType.RETURN]: 'Return Inspection / ตรวจรับคืน',
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-4 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={16} />
        Back to Rental
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold">New Inspection Report</h1>
        <p className="text-sm mt-0.5" style={{ color: '#676879' }}>
          รายงานการตรวจสอบ
          {rental && ` · ${rental.rentalNumber}`}
        </p>
      </div>

      {/* Type + Date */}
      <div className="bg-white rounded-lg border p-5 mb-4 space-y-4" style={{ borderColor: '#e6e9ef' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#676879' }}>
            Inspection Type / ประเภทการตรวจสอบ
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(InspectionType).map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className="px-3 py-1.5 rounded text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: type === t ? '#00897b' : 'white',
                  color: type === t ? 'white' : '#323338',
                  borderColor: type === t ? '#00897b' : '#e6e9ef',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#676879' }}>
            Inspection Date / วันที่ตรวจสอบ
          </label>
          <input
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            className="w-full md:w-52 rounded border px-3 py-2 text-sm"
            style={{ borderColor: '#e6e9ef', outline: 'none' }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-lg border mb-4" style={{ borderColor: '#e6e9ef' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <div>
            <p className="text-sm font-semibold">Checklist / รายการตรวจสอบ</p>
            <div className="flex gap-3 mt-1 text-xs">
              <span style={{ color: '#00897b' }}>✓ PASS: {passCount}</span>
              <span style={{ color: '#e44258' }}>✗ FAIL: {failCount}</span>
              <span style={{ color: '#676879' }}>— N/A: {naCount}</span>
            </div>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: '#e6e9ef' }}>
          {items.map((item, idx) => (
            <div key={idx} className="p-3 md:p-4">
              <div className="flex items-start gap-3">
                {/* Status toggle buttons — large tap targets for mobile/field use */}
                <div className="flex gap-1 shrink-0">
                  {(['PASS', 'FAIL', 'NA'] as ItemStatus[]).map((s) => {
                    const isActive = item.status === s;
                    const colors = s === 'PASS'
                      ? { active: '#00897b', activeBg: '#e0f2f1' }
                      : s === 'FAIL'
                      ? { active: '#e44258', activeBg: '#fff5f6' }
                      : { active: '#676879', activeBg: '#f5f6f8' };
                    return (
                      <button
                        key={s}
                        onClick={() => setItemStatus(idx, s)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-xs font-bold border transition-colors"
                        style={{
                          backgroundColor: isActive ? colors.activeBg : 'white',
                          color: isActive ? colors.active : '#c4c4c4',
                          borderColor: isActive ? colors.active : '#e6e9ef',
                        }}
                        aria-label={s}
                      >
                        {s === 'PASS' ? <CheckCircle2 size={18} /> : s === 'FAIL' ? <XCircle size={18} /> : <MinusCircle size={18} />}
                      </button>
                    );
                  })}
                </div>

                {/* Item name + note */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.itemName}</p>
                  {(item.status === 'FAIL' || item.note) && (
                    <input
                      type="text"
                      placeholder={item.status === 'FAIL' ? 'Describe the issue... / อธิบายปัญหา' : 'Note (optional)'}
                      value={item.note}
                      onChange={(e) => setItemNote(idx, e.target.value)}
                      className="mt-1.5 w-full text-xs rounded border px-2 py-1.5"
                      style={{ borderColor: item.status === 'FAIL' ? '#e44258' : '#e6e9ef', outline: 'none' }}
                    />
                  )}
                </div>

                <button
                  onClick={() => removeItem(idx)}
                  className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors"
                  style={{ color: '#c4c4c4' }}
                  aria-label="Remove item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom item */}
        <div className="p-3 border-t flex gap-2" style={{ borderColor: '#e6e9ef' }}>
          <input
            type="text"
            placeholder="Add custom item / เพิ่มรายการ"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            className="flex-1 text-sm rounded border px-3 py-2"
            style={{ borderColor: '#e6e9ef', outline: 'none' }}
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded border transition-colors disabled:opacity-40"
            style={{ borderColor: '#00897b', color: '#00897b' }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Overall Condition */}
      <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: '#e6e9ef' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#676879' }}>
          Overall Condition / สภาพโดยรวม
        </p>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setOverallCondition(n)}
              className="text-3xl transition-transform hover:scale-110"
              style={{ color: n <= overallCondition ? '#fdab3d' : '#e6e9ef' }}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
          <span className="text-sm ml-2 font-medium">{overallCondition} / 5</span>
        </div>
        <div className="flex gap-4 text-xs mt-1" style={{ color: '#676879' }}>
          <span>1 = Poor</span><span>3 = Fair</span><span>5 = Excellent</span>
        </div>
      </div>

      {/* Damage Notes */}
      <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: '#e6e9ef' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#676879' }}>
          Damage / Remarks / หมายเหตุความเสียหาย
        </p>
        <textarea
          value={damageNotes}
          onChange={(e) => setDamageNotes(e.target.value)}
          placeholder="Describe any damage or important notes... / บรรยายความเสียหายหรือหมายเหตุสำคัญ"
          rows={3}
          className="w-full text-sm rounded border px-3 py-2 resize-none"
          style={{ borderColor: '#e6e9ef', outline: 'none' }}
        />
      </div>

      {/* Customer Signature */}
      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: '#e6e9ef' }}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={customerSignature}
            onChange={(e) => setCustomerSignature(e.target.checked)}
            className="w-5 h-5 rounded accent-teal-600"
          />
          <div>
            <p className="text-sm font-medium">Customer Signature Obtained / ลูกค้าลงนามรับทราบ</p>
            <p className="text-xs mt-0.5" style={{ color: '#676879' }}>
              Check this box to confirm the customer has signed the inspection form
            </p>
          </div>
        </label>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 bg-white border-t pt-4 pb-4 md:pb-0 md:static md:border-0 md:bg-transparent md:pt-0" style={{ borderColor: '#e6e9ef' }}>
        <button
          onClick={handleSubmit}
          disabled={createInspection.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded text-base font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#00897b' }}
        >
          {createInspection.isPending && <Loader2 size={16} className="animate-spin" />}
          {createInspection.isPending ? 'Saving...' : 'Submit Inspection Report / บันทึก'}
        </button>
      </div>
    </div>
  );
}
