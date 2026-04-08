'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, Wrench, ClipboardList, Package,
  AlertTriangle, Loader2, Calendar, MapPin, DollarSign,
} from 'lucide-react';
import Link from 'next/link';

// ── Hooks ─────────────────────────────────────────────────────────────────

function useEquipmentDetail(id: string) {
  return useQuery({
    queryKey: ['rental-equipment-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/equipment/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data;
    },
    enabled: !!id,
  });
}

function usePatchEquipment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Update failed');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rental-equipment-detail', id] });
      qc.invalidateQueries({ queryKey: ['rental-equipment'] });
    },
  });
}

// ── Badges ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  AVAILABLE:   { bg: '#e0f8ef', color: '#00875a' },
  RENTED:      { bg: '#e3f2fd', color: '#1565c0' },
  MAINTENANCE: { bg: '#fff8e1', color: '#e65100' },
  RETIRED:     { bg: '#f5f5f5', color: '#757575' },
};

const CONDITION_STYLE: Record<string, { bg: string; color: string }> = {
  EXCELLENT: { bg: '#e0f2f1', color: '#006b5e' },
  GOOD:      { bg: '#e8f5e9', color: '#2e7d32' },
  FAIR:      { bg: '#fff8e1', color: '#f57f17' },
  POOR:      { bg: '#fce4ec', color: '#c62828' },
};

const CONTRACT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:      { bg: '#f5f5f5', color: '#757575' },
  ACTIVE:     { bg: '#e0f8ef', color: '#00875a' },
  EXTENDED:   { bg: '#e3f2fd', color: '#1565c0' },
  COMPLETED:  { bg: '#e8f5e9', color: '#2e7d32' },
  CANCELLED:  { bg: '#fce4ec', color: '#c62828' },
};

const MAINT_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PREVENTIVE: { bg: '#e0f2f1', color: '#006b5e', label: 'Preventive' },
  CORRECTIVE: { bg: '#fff8e1', color: '#f57f17', label: 'Corrective' },
  INSPECTION: { bg: '#e3f2fd', color: '#1565c0', label: 'Inspection' },
};

function Pill({ text, style }: { text: string; style: { bg: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {text}
    </span>
  );
}

// ── Schedule Maintenance Modal ────────────────────────────────────────────

function ScheduleMaintenanceModal({
  equipmentId, onClose, onDone,
}: { equipmentId: string; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState('PREVENTIVE');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [description, setDescription] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) { toast.error('Scheduled date is required'); return; }

    setIsPending(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          equipmentId, type, scheduledDate, description, technicianName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to schedule');
      toast.success('Maintenance scheduled');
      onDone();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-base font-bold">Schedule Maintenance</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#e6e9ef', height: 38 }}
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="INSPECTION">Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#e6e9ef', height: 38 }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Technician Name</label>
              <input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="e.g. Somchai K."
                className="w-full border rounded px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#e6e9ef', height: 38 }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Work to be performed…"
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm outline-none resize-none"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button
              type="button" onClick={onClose} disabled={isPending}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

type Tab = 'info' | 'maintenance' | 'rentals';

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showMaintModal, setShowMaintModal] = useState(false);

  const { data: equipment, isLoading, refetch } = useEquipmentDetail(id);
  const patch = usePatchEquipment(id);

  const canManage = ['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(user?.role ?? '');
  const canMaintain = canManage || ['PRODUCT_MANAGER', 'PRODUCTION_MANAGER'].includes(user?.role ?? '');

  const handleRetire = async () => {
    if (!confirm('Mark this equipment as Retired? This action indicates the asset is no longer in service.')) return;
    try {
      await patch.mutateAsync({ status: 'RETIRED' });
      toast.success('Equipment marked as Retired');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetMaintenance = async () => {
    if (!confirm('Change status to Maintenance?')) return;
    try {
      await patch.mutateAsync({ status: 'MAINTENANCE' });
      toast.success('Status updated to Maintenance');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="skeleton h-7 w-48 mb-4 rounded" />
        <div className="skeleton h-32 rounded-xl mb-4" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="p-6 text-center" style={{ color: '#676879' }}>
        <Package size={40} className="mx-auto mb-3 opacity-20" />
        <p className="font-semibold">Equipment not found</p>
        <button onClick={() => router.back()} className="text-sm mt-2 underline">Go back</button>
      </div>
    );
  }

  const maintenanceRecords: any[] = equipment.maintenanceRecords ?? [];
  const rentalHistory: any[] = equipment.rentalHistory ?? [];

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'info',        label: 'Info' },
    { key: 'maintenance', label: 'Maintenance', count: maintenanceRecords.length },
    { key: 'rentals',     label: 'Rental History', count: rentalHistory.length },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {showMaintModal && (
        <ScheduleMaintenanceModal
          equipmentId={id}
          onClose={() => setShowMaintModal(false)}
          onDone={() => { setShowMaintModal(false); refetch(); setActiveTab('maintenance'); }}
        />
      )}

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-5 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={15} />
        Back to Equipment
      </button>

      {/* Header card */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#e0f2f1' }}
            >
              <Package size={26} style={{ color: '#00897b' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#323338' }}>
                {equipment.productName}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#676879' }}>
                {equipment.brandName}
                {equipment.categoryName && (
                  <span style={{ color: '#c4c4c4' }}> · {equipment.categoryName}</span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Pill
                  text={equipment.status.charAt(0) + equipment.status.slice(1).toLowerCase()}
                  style={STATUS_STYLE[equipment.status] ?? { bg: '#f5f5f5', color: '#757575' }}
                />
                <Pill
                  text={equipment.condition.charAt(0) + equipment.condition.slice(1).toLowerCase()}
                  style={CONDITION_STYLE[equipment.condition] ?? { bg: '#f5f5f5', color: '#757575' }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canMaintain && equipment.status !== 'RETIRED' && (
              <button
                onClick={() => setShowMaintModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#e6e9ef', color: '#323338' }}
              >
                <Wrench size={14} />
                Schedule Maintenance
              </button>
            )}
            {canMaintain && equipment.status === 'AVAILABLE' && (
              <button
                onClick={handleSetMaintenance}
                disabled={patch.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors disabled:opacity-50"
                style={{ borderColor: '#fdab3d', color: '#e65100' }}
              >
                {patch.isPending ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                Under Maintenance
              </button>
            )}
            {canManage && equipment.status !== 'RETIRED' && (
              <button
                onClick={handleRetire}
                disabled={patch.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                style={{ borderColor: '#e6e9ef', color: '#676879' }}
              >
                Mark as Retired
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5" style={{ borderColor: '#e6e9ef' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              color: activeTab === tab.key ? '#00897b' : '#676879',
              borderBottom: activeTab === tab.key ? '2px solid #00897b' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: activeTab === tab.key ? '#00897b' : '#e6e9ef',
                  color: activeTab === tab.key ? 'white' : '#676879',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Info tab ── */}
      {activeTab === 'info' && (
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Asset Tag',       value: equipment.assetTag ?? '—' },
              { label: 'Serial Number',   value: equipment.serialNumber },
              { label: 'Model Number',    value: equipment.modelNumber ?? '—' },
              { label: 'SKU',             value: equipment.sku ?? '—' },
              { label: 'Purchase Date',   value: formatDate(equipment.purchaseDate) },
              {
                label: 'Purchase Price',
                value: equipment.purchasePrice
                  ? `฿${Number(equipment.purchasePrice).toLocaleString()}`
                  : '—',
              },
              { label: 'Added',           value: formatDate(equipment.createdAt) },
              { label: 'Last Updated',    value: formatDate(equipment.updatedAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#b4b7c3' }}>
                  {label}
                </p>
                <p className="text-sm font-medium" style={{ color: '#323338' }}>{value}</p>
              </div>
            ))}

            {equipment.currentLocation && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#b4b7c3' }}>
                  Current Location
                </p>
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#323338' }}>
                  <MapPin size={14} style={{ color: '#00897b' }} />
                  {equipment.currentLocation}
                </div>
              </div>
            )}

            {equipment.productDescription && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#b4b7c3' }}>
                  Product Description
                </p>
                <p className="text-sm" style={{ color: '#676879' }}>{equipment.productDescription}</p>
              </div>
            )}

            {equipment.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#b4b7c3' }}>
                  Notes
                </p>
                <p className="text-sm" style={{ color: '#676879' }}>{equipment.notes}</p>
              </div>
            )}
          </div>

          {/* Rental rates */}
          {(equipment.rentalDailyRate || equipment.rentalWeeklyRate || equipment.rentalMonthlyRate) && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#e6e9ef' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#b4b7c3' }}>
                Standard Rental Rates
              </p>
              <div className="flex gap-4 flex-wrap">
                {equipment.rentalDailyRate > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign size={13} style={{ color: '#00897b' }} />
                    <span style={{ color: '#676879' }}>Daily:</span>
                    <span className="font-semibold">฿{Number(equipment.rentalDailyRate).toLocaleString()}</span>
                  </div>
                )}
                {equipment.rentalWeeklyRate > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign size={13} style={{ color: '#00897b' }} />
                    <span style={{ color: '#676879' }}>Weekly:</span>
                    <span className="font-semibold">฿{Number(equipment.rentalWeeklyRate).toLocaleString()}</span>
                  </div>
                )}
                {equipment.rentalMonthlyRate > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign size={13} style={{ color: '#00897b' }} />
                    <span style={{ color: '#676879' }}>Monthly:</span>
                    <span className="font-semibold">฿{Number(equipment.rentalMonthlyRate).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Maintenance tab ── */}
      {activeTab === 'maintenance' && (
        <div>
          {canMaintain && equipment.status !== 'RETIRED' && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowMaintModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#00897b' }}
              >
                <Wrench size={14} />
                Schedule Maintenance
              </button>
            </div>
          )}

          {maintenanceRecords.length === 0 ? (
            <div className="card text-center py-16" style={{ color: '#676879' }}>
              <Wrench size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">No maintenance records</p>
              <p className="text-xs mt-1 opacity-60">Scheduled and completed maintenance will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {maintenanceRecords.map((m: any) => {
                const typeStyle = MAINT_TYPE_STYLE[m.type] ?? { bg: '#f5f5f5', color: '#757575', label: m.type };
                const isCompleted = !!m.completedDate;
                return (
                  <div key={m.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill text={typeStyle.label} style={typeStyle} />
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: isCompleted ? '#e8f5e9' : '#fff8e1',
                            color: isCompleted ? '#2e7d32' : '#f57f17',
                          }}
                        >
                          {isCompleted ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs" style={{ color: '#b4b7c3' }}>
                          {isCompleted ? 'Completed' : 'Scheduled'}
                        </p>
                        <p className="text-sm font-medium">
                          {formatDate(isCompleted ? m.completedDate : m.scheduledDate)}
                        </p>
                      </div>
                    </div>

                    {m.description && (
                      <p className="text-sm mt-2" style={{ color: '#676879' }}>{m.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {m.technicianName && (
                        <span className="text-xs" style={{ color: '#b4b7c3' }}>
                          Technician: <span style={{ color: '#676879' }}>{m.technicianName}</span>
                        </span>
                      )}
                      {m.totalCost > 0 && (
                        <span className="text-xs" style={{ color: '#b4b7c3' }}>
                          Cost: <span className="font-medium" style={{ color: '#323338' }}>
                            ฿{Number(m.totalCost).toLocaleString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Rental History tab ── */}
      {activeTab === 'rentals' && (
        <div>
          {rentalHistory.length === 0 ? (
            <div className="card text-center py-16" style={{ color: '#676879' }}>
              <ClipboardList size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">No rental history</p>
              <p className="text-xs mt-1 opacity-60">Contracts using this equipment will appear here</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Customer</th>
                    <th>Rate</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalHistory.map((r: any) => {
                    const cs = CONTRACT_STATUS_STYLE[r.contractStatus] ?? { bg: '#f5f5f5', color: '#757575' };
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="font-mono text-sm font-medium">{r.contractNumber}</span>
                        </td>
                        <td>
                          <p className="text-sm font-medium">{r.customerName}</p>
                        </td>
                        <td>
                          <p className="text-sm">
                            ฿{Number(r.agreedRate).toLocaleString()}
                            <span className="text-xs ml-1" style={{ color: '#b4b7c3' }}>
                              /{r.agreedRateType?.toLowerCase()}
                            </span>
                          </p>
                        </td>
                        <td className="text-sm">{formatDate(r.startDate)}</td>
                        <td className="text-sm">
                          {r.actualReturnDate
                            ? <span>{formatDate(r.actualReturnDate)} <span style={{ color: '#b4b7c3' }}>(actual)</span></span>
                            : formatDate(r.endDate)
                          }
                        </td>
                        <td>
                          <Pill
                            text={r.contractStatus.charAt(0) + r.contractStatus.slice(1).toLowerCase()}
                            style={cs}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
