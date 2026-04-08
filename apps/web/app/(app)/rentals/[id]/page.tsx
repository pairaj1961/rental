'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRental, useRentalTimeline, useTransitionRental } from '@/hooks/useRentals';
import { useMaintenanceLogs, useCreateMaintenanceLog, useUpdateMaintenanceLog } from '@/hooks/useMaintenance';
import { useInspections } from '@/hooks/useInspections';
import { RentalStatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft, FileText, AlertCircle, Loader2, RefreshCw, Plus,
  Wrench, Pencil, ClipboardList, Download, FilePlus, Clock, CheckCircle2,
} from 'lucide-react';
import { RentalStatus, STATUS_TRANSITIONS, MaintenanceType, DocumentType } from '@rental/shared';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import SwapEquipmentModal from '@/components/rentals/SwapEquipmentModal';
import MaintenanceLogModal from '@/components/rentals/MaintenanceLogModal';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

/* ── Constants ───────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  ORDER_RECEIVED: 'Order Received', PREPARING: 'Preparing', DELIVERED: 'Delivered',
  ACTIVE: 'Active', RETURNING: 'Returning', CLOSED: 'Closed', CANCELLED: 'Cancelled',
};

const TRANSITION_LABELS: Record<string, string> = {
  PREPARING: '→ Preparing', DELIVERED: '→ Deliver', ACTIVE: '→ Activate',
  RETURNING: '→ Returning', CLOSED: '→ Close', CANCELLED: '✕ Cancel',
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  PRE_DELIVERY: 'Pre-Delivery', DELIVERY: 'Delivery Handover', RETURN: 'Return Inspection',
};

const INSPECTION_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  PRE_DELIVERY: { bg: '#e0f2f1', color: '#006b5e' },
  DELIVERY:     { bg: '#e3f2fd', color: '#1565c0' },
  RETURN:       { bg: '#fce4ec', color: '#c62828' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  RENTAL_CONTRACT: 'Rental Contract',
  DELIVERY_NOTE:   'Delivery Note',
  INSPECTION_FORM: 'Inspection Form',
  RETURN_FORM:     'Return Form',
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`} style={{ borderColor: '#e6e9ef' }}>
      {children}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'inspections' | 'maintenance' | 'timeline' | 'documents'>('overview');
  const [pendingTransition, setPendingTransition] = useState<RentalStatus | null>(null);
  const [showSwap, setShowSwap] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  const { data: rental, isLoading } = useRental(id);
  const { data: timeline } = useRentalTimeline(id);
  const { data: maintenanceLogs } = useMaintenanceLogs(id);
  const { data: inspections } = useInspections(id);
  const createLog = useCreateMaintenanceLog(id);
  const updateLog = useUpdateMaintenanceLog(id);
  const transition = useTransitionRental();

  const MGMT = ['MANAGER','ADMIN','SYSTEM_ADMIN','SALES_MANAGER'];
  const SVC  = ['SERVICE','PRODUCTION_MANAGER','PRODUCT_MANAGER'];
  const role = user?.role ?? '';
  const canTransition   = MGMT.includes(role);
  const canMaintenance  = [...MGMT,...SVC].includes(role);
  const canInspect      = [...MGMT,...SVC].includes(role);
  const canGenerateDocs = MGMT.includes(role);

  const SWAPPABLE_STATUSES = [RentalStatus.DELIVERED, RentalStatus.ACTIVE, RentalStatus.RETURNING];

  const confirmTransition = async () => {
    if (!pendingTransition) return;
    try {
      await transition.mutateAsync({ id, to: pendingTransition });
      toast.success(`Status → ${STATUS_LABELS[pendingTransition] ?? pendingTransition}`);
      setPendingTransition(null);
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred');
      setPendingTransition(null);
    }
  };

  const handleGenerateDoc = async (type: DocumentType) => {
    setGeneratingDoc(type);
    try {
      await api.post(`/api/v1/rentals/${id}/documents`, { type });
      toast.success(`${DOC_TYPE_LABELS[type]} generated`);
      qc.invalidateQueries({ queryKey: ['rental', id] });
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate document');
    } finally {
      setGeneratingDoc(null);
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="skeleton h-6 w-32 mb-5 rounded" />
        <div className="skeleton h-10 w-56 mb-2 rounded" />
        <div className="skeleton h-5 w-36 mb-6 rounded" />
        <div className="skeleton h-52 rounded-xl" />
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="p-6 text-sm" style={{ color: '#676879' }}>
        Rental not found.
      </div>
    );
  }

  const nextStatuses: RentalStatus[] = STATUS_TRANSITIONS[rental.status as RentalStatus] ?? [];
  const timelineItems: any[] = timeline ?? [];
  const logs: any[] = maintenanceLogs ?? [];
  const inspectionList: any[] = inspections ?? [];

  const TABS = [
    { key: 'overview',     label: 'Overview',                               count: null },
    { key: 'inspections',  label: 'Inspections',                            count: inspectionList.length },
    { key: 'maintenance',  label: 'Maintenance',                            count: logs.length },
    { key: 'timeline',     label: 'History',                                count: timelineItems.length },
    { key: 'documents',    label: 'Documents',                              count: rental.documents?.length ?? 0 },
  ];

  return (
    <div className="p-5 md:p-6 max-w-4xl">
      <SwapEquipmentModal
        open={showSwap}
        onClose={() => setShowSwap(false)}
        rentalId={rental.id}
        currentEquipmentId={rental.equipmentId}
        currentEquipmentName={`${rental.equipment?.modelName} (${rental.equipment?.serialNumber})`}
      />
      <MaintenanceLogModal
        open={showMaintModal}
        onClose={() => { setShowMaintModal(false); setEditLog(null); }}
        equipmentId={rental.equipmentId}
        rentalId={id}
        log={editLog}
        onCreate={(data) => createLog.mutateAsync(data)}
        onUpdate={(data) => updateLog.mutateAsync(data)}
      />

      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm mb-5 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={15} />
        Back
      </button>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono" style={{ color: '#323338' }}>
            {rental.rentalNumber}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#676879' }}>
            Created {formatDate(rental.createdAt)}
            {(rental.creator?.name || rental.createdBy?.name) && (
              <> · by <strong>{rental.creator?.name ?? rental.createdBy?.name}</strong></>
            )}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <RentalStatusBadge status={rental.status} />
        </div>
      </div>

      {/* ── Transition buttons ── */}
      {canTransition && (nextStatuses.length > 0 || SWAPPABLE_STATUSES.includes(rental.status as RentalStatus)) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setPendingTransition(s)}
              disabled={transition.isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: s === RentalStatus.CANCELLED ? '#e44258' : '#00897b' }}
            >
              {TRANSITION_LABELS[s] ?? s}
            </button>
          ))}
          {SWAPPABLE_STATUSES.includes(rental.status as RentalStatus) && (
            <button
              onClick={() => setShowSwap(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-amber-50"
              style={{ borderColor: '#f59e0b', color: '#b45309', backgroundColor: '#fffbeb' }}
            >
              <RefreshCw size={14} />
              Swap Equipment
            </button>
          )}
        </div>
      )}

      {/* ── Transition confirmation ── */}
      {pendingTransition && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border mb-5"
          style={{
            borderColor: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b',
            backgroundColor: pendingTransition === RentalStatus.CANCELLED ? '#fff5f6' : '#e0f2f1',
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle size={15} style={{ color: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b', flexShrink: 0 }} />
            <span className="font-semibold">
              Confirm change to &ldquo;{STATUS_LABELS[pendingTransition]}&rdquo;?
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setPendingTransition(null)}
              disabled={transition.isPending}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-white disabled:opacity-50 transition-colors"
              style={{ borderColor: '#e6e9ef' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmTransition}
              disabled={transition.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b' }}
            >
              {transition.isPending && <Loader2 size={12} className="animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex border-b mb-6 overflow-x-auto gap-0" style={{ borderColor: '#e6e9ef' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors"
            style={{
              color: activeTab === tab.key ? '#00897b' : '#676879',
              borderBottom: activeTab === tab.key ? '2px solid #00897b' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                style={{
                  backgroundColor: activeTab === tab.key ? '#e0f2f1' : '#f5f6f8',
                  color: activeTab === tab.key ? '#006b5e' : '#676879',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          <SectionCard>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <InfoRow label="Customer / ลูกค้า"       value={rental.customer?.companyName} />
              <InfoRow label="Contact Person"            value={rental.customer?.contactPerson} />
              <InfoRow label="Job Site / หน้างาน"      value={rental.jobSite?.siteName} />
              <InfoRow label="Site Address"              value={rental.jobSite?.siteAddress} />
              <InfoRow label="Equipment / เครื่องจักร" value={rental.equipment?.modelName} />
              <InfoRow label="Serial No."                value={rental.equipment?.serialNumber} />
              <InfoRow label="Start Date / วันเริ่ม"   value={formatDate(rental.rentalStartDate)} />
              <InfoRow label="End Date / วันสิ้นสุด"   value={rental.rentalEndDate ? formatDate(rental.rentalEndDate) : '—'} />
              <InfoRow label="Actual Return / คืนจริง" value={rental.actualReturnDate ? formatDate(rental.actualReturnDate) : '—'} />
            </div>
            {rental.specialConditions && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: '#f0f0f0' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#676879' }}>
                  Special Conditions / เงื่อนไขพิเศษ
                </p>
                <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                  {rental.specialConditions}
                </p>
              </div>
            )}
          </SectionCard>

          {rental.assignedService?.length > 0 && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#676879' }}>
                Service Team / ทีม Service
              </p>
              <div className="flex flex-wrap gap-2">
                {rental.assignedService.map((u: any) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══ INSPECTIONS ════════════════════════════════════════════ */}
      {activeTab === 'inspections' && (
        <div className="animate-fade-in">
          {canInspect && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => router.push(`/rentals/${id}/inspections/new`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#00897b' }}
              >
                <Plus size={14} />
                New Inspection
              </button>
            </div>
          )}

          {inspectionList.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#676879' }}>
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">No inspection reports yet</p>
              <p className="text-xs mt-1 opacity-60">ยังไม่มีรายงานการตรวจสอบ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspectionList.map((insp: any) => {
                const tc = INSPECTION_TYPE_COLORS[insp.type] ?? { bg: '#f5f6f8', color: '#323338' };
                const passCount = (insp.checklistItems ?? []).filter((i: any) => i.status === 'PASS').length;
                const failCount = (insp.checklistItems ?? []).filter((i: any) => i.status === 'FAIL').length;
                const total = (insp.checklistItems ?? []).length;
                return (
                  <div
                    key={insp.id}
                    className="card p-4 cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
                    onClick={() => router.push(`/rentals/${id}/inspections/${insp.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: tc.bg, color: tc.color }}
                      >
                        {INSPECTION_TYPE_LABELS[insp.type] ?? insp.type}
                      </span>
                      <span className="text-xs" style={{ color: '#676879' }}>
                        {formatDate(insp.inspectionDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <span key={i} style={{ color: i <= insp.overallCondition ? '#fdab3d' : '#e6e9ef', fontSize: 15 }}>★</span>
                        ))}
                        <span className="text-xs ml-1" style={{ color: '#676879' }}>{insp.overallCondition}/5</span>
                      </div>
                      {/* Checklist summary */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold" style={{ color: '#00897b' }}>✓ {passCount}</span>
                        {failCount > 0 && <span className="font-semibold" style={{ color: '#e44258' }}>✗ {failCount}</span>}
                        <span style={{ color: '#676879' }}>/ {total}</span>
                      </div>
                      {insp.customerSignature && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
                          <CheckCircle2 size={10} /> Signed
                        </span>
                      )}
                    </div>
                    {insp.inspectedBy?.name && (
                      <p className="text-xs mt-2" style={{ color: '#b4b7c3' }}>
                        Inspected by: {insp.inspectedBy.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MAINTENANCE ════════════════════════════════════════════ */}
      {activeTab === 'maintenance' && (
        <div className="animate-fade-in">
          {canMaintenance && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setEditLog(null); setShowMaintModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#00897b' }}
              >
                <Plus size={14} />
                Add Log
              </button>
            </div>
          )}
          {logs.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#676879' }}>
              <Wrench size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No maintenance logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => {
                const typeStyle = log.type === MaintenanceType.EMERGENCY
                  ? { bg: '#fff5f6', color: '#e44258', label: 'Emergency' }
                  : log.type === MaintenanceType.PM
                  ? { bg: '#e0f2f1', color: '#006b5e', label: 'PM' }
                  : { bg: '#f5f6f8', color: '#323338', label: 'Repair' };
                return (
                  <div key={log.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <Wrench size={14} style={{ color: '#676879' }} />
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                        >
                          {typeStyle.label}
                        </span>
                        <span className="text-sm font-semibold">{formatDate(log.visitDate)}</span>
                      </div>
                      {canMaintenance && (
                        <button
                          onClick={() => { setEditLog(log); setShowMaintModal(true); }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 border rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ borderColor: '#e6e9ef', color: '#676879' }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>
                    <p className="text-sm">{log.description}</p>
                    {log.downtimeHours > 0 && (
                      <p className="text-xs mt-1.5" style={{ color: '#676879' }}>
                        Downtime: <strong>{log.downtimeHours}h</strong>
                      </p>
                    )}
                    {log.partsUsed?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t" style={{ borderColor: '#f0f0f0' }}>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: '#676879' }}>Parts used:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {log.partsUsed.map((p: any, i: number) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-lg"
                              style={{ backgroundColor: '#f5f6f8', color: '#323338' }}
                            >
                              {p.name} × {p.quantity}{p.cost != null ? ` · ฿${p.cost}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {log.technician?.name && (
                      <p className="text-xs mt-2" style={{ color: '#b4b7c3' }}>
                        Technician: {log.technician.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TIMELINE ═══════════════════════════════════════════════ */}
      {activeTab === 'timeline' && (
        <div className="animate-fade-in">
          {timelineItems.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#676879' }}>
              <Clock size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No history yet</p>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Vertical line */}
              <div
                className="absolute left-3.5 top-3 bottom-3 w-px"
                style={{ backgroundColor: '#e6e9ef' }}
              />
              <div className="space-y-5">
                {timelineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 relative">
                    <div
                      className="absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm"
                      style={{ backgroundColor: '#00897b' }}
                    >
                      <Clock size={13} color="white" />
                    </div>
                    <div className="flex-1 card p-3.5">
                      <p className="text-sm font-semibold">
                        {item.description ?? STATUS_LABELS[item.status] ?? item.status}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: '#676879' }}>
                        <span>{formatDateTime(item.timestamp ?? item.createdAt)}</span>
                        {item.actor?.name && (
                          <>
                            <span>·</span>
                            <span className="font-medium">{item.actor.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ DOCUMENTS ══════════════════════════════════════════════ */}
      {activeTab === 'documents' && (
        <div className="space-y-4 animate-fade-in">
          {canGenerateDocs && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#676879' }}>
                Generate Document / สร้างเอกสาร
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.values(DocumentType) as string[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGenerateDoc(type as DocumentType)}
                    disabled={!!generatingDoc}
                    className="flex flex-col items-center gap-2 px-3 py-3 text-xs font-semibold rounded-xl border transition-all hover:bg-teal-50 hover:border-teal-300 disabled:opacity-50"
                    style={{ borderColor: '#e6e9ef', color: '#006b5e' }}
                  >
                    {generatingDoc === type
                      ? <Loader2 size={18} className="animate-spin" />
                      : <FilePlus size={18} />
                    }
                    {DOC_TYPE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {(!rental.documents || rental.documents.length === 0) ? (
            <div className="text-center py-12" style={{ color: '#676879' }}>
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">No documents yet</p>
              <p className="text-xs mt-1 opacity-60">Generate one above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rental.documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 p-4 card transition-all hover:shadow-md hover:border-teal-200"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#e0f2f1' }}
                  >
                    <FileText size={18} style={{ color: '#00897b' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#676879' }}>
                      Generated {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#0073ea' }}>
                    <Download size={14} />
                    Download
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
