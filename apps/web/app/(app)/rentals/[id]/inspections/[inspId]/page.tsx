'use client';

import { useParams, useRouter } from 'next/navigation';
import { useInspection } from '@/hooks/useInspections';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  PRE_DELIVERY: 'Pre-Delivery / ก่อนส่งมอบ',
  DELIVERY: 'Delivery Handover / ส่งมอบ',
  RETURN: 'Return Inspection / ตรวจรับคืน',
};

const INSPECTION_TYPE_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  PRE_DELIVERY: { backgroundColor: '#e0f2f1', color: '#006b5e' },
  DELIVERY: { backgroundColor: '#e3f2fd', color: '#1565c0' },
  RETURN: { backgroundColor: '#fce4ec', color: '#c62828' },
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rentalId = params.id as string;
  const inspId = params.inspId as string;

  const { data: inspection, isLoading } = useInspection(rentalId, inspId);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-64 mb-4" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  if (!inspection) {
    return <div className="p-6 text-sm" style={{ color: '#676879' }}>Inspection report not found</div>;
  }

  const checklistItems: any[] = inspection.checklistItems ?? [];
  const passCount = checklistItems.filter((i) => i.status === 'PASS').length;
  const failCount = checklistItems.filter((i) => i.status === 'FAIL').length;
  const naCount = checklistItems.filter((i) => i.status === 'NA').length;
  const typeColors = INSPECTION_TYPE_COLORS[inspection.type] ?? { backgroundColor: '#f5f6f8', color: '#323338' };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-4 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Inspection Report</h1>
          <p className="text-sm mt-0.5" style={{ color: '#676879' }}>รายงานการตรวจสอบ</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={typeColors}>
          {INSPECTION_TYPE_LABELS[inspection.type] ?? inspection.type}
        </span>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-lg border p-5 mb-4 grid grid-cols-2 gap-4" style={{ borderColor: '#e6e9ef' }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>Date / วันที่</p>
          <p className="text-sm font-medium">{formatDate(inspection.inspectionDate)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>Inspector / ผู้ตรวจสอบ</p>
          <p className="text-sm font-medium">{inspection.inspectedBy?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>Overall Condition / สภาพโดยรวม</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} style={{ color: n <= inspection.overallCondition ? '#fdab3d' : '#e6e9ef', fontSize: 18 }}>★</span>
            ))}
            <span className="text-sm ml-1 font-medium">{inspection.overallCondition}/5</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>Customer Signature</p>
          <p className="text-sm font-medium" style={{ color: inspection.customerSignature ? '#00897b' : '#676879' }}>
            {inspection.customerSignature ? '✓ Signed / ลงนามแล้ว' : '— Not signed'}
          </p>
        </div>
      </div>

      {/* Checklist summary */}
      <div className="bg-white rounded-lg border mb-4" style={{ borderColor: '#e6e9ef' }}>
        <div className="p-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Checklist / รายการตรวจสอบ ({checklistItems.length} items)</p>
            <div className="flex gap-3 text-xs">
              <span style={{ color: '#00897b' }}>✓ {passCount}</span>
              {failCount > 0 && <span style={{ color: '#e44258' }}>✗ {failCount}</span>}
              <span style={{ color: '#676879' }}>— {naCount}</span>
            </div>
          </div>

          {/* Progress bar */}
          {checklistItems.length > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-px" style={{ backgroundColor: '#f5f6f8' }}>
              {passCount > 0 && (
                <div style={{ width: `${(passCount / checklistItems.length) * 100}%`, backgroundColor: '#00c875' }} />
              )}
              {failCount > 0 && (
                <div style={{ width: `${(failCount / checklistItems.length) * 100}%`, backgroundColor: '#e44258' }} />
              )}
              {naCount > 0 && (
                <div style={{ width: `${(naCount / checklistItems.length) * 100}%`, backgroundColor: '#c4c4c4' }} />
              )}
            </div>
          )}
        </div>

        <div className="divide-y" style={{ borderColor: '#e6e9ef' }}>
          {checklistItems.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-3 md:p-4">
              <div className="shrink-0 mt-0.5">
                {item.status === 'PASS' && <CheckCircle2 size={18} style={{ color: '#00897b' }} />}
                {item.status === 'FAIL' && <XCircle size={18} style={{ color: '#e44258' }} />}
                {item.status === 'NA' && <MinusCircle size={18} style={{ color: '#c4c4c4' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.itemName}</p>
                {item.note && (
                  <p className="text-xs mt-0.5" style={{ color: item.status === 'FAIL' ? '#e44258' : '#676879' }}>
                    {item.note}
                  </p>
                )}
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                style={{
                  backgroundColor: item.status === 'PASS' ? '#e0f2f1' : item.status === 'FAIL' ? '#fff5f6' : '#f5f6f8',
                  color: item.status === 'PASS' ? '#006b5e' : item.status === 'FAIL' ? '#e44258' : '#676879',
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Damage notes */}
      {inspection.damageNotes && (
        <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: '#e44258' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#e44258' }}>
            Damage / Remarks / หมายเหตุความเสียหาย
          </p>
          <p className="text-sm">{inspection.damageNotes}</p>
        </div>
      )}

      {/* Photos */}
      {inspection.photos?.length > 0 && (
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: '#e6e9ef' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#676879' }}>
            Photos / รูปภาพ ({inspection.photos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {inspection.photos.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-24 object-cover rounded border"
                  style={{ borderColor: '#e6e9ef' }}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
