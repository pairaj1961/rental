'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Wrench, X, CheckCircle2, Plus, Loader2 } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  serialNumber: string;
  assetTag: string | null;
  productName: string | null;
  type: string;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  description: string | null;
  technicianName: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  createdAt: string;
}

/* ── Constants ─────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '',            label: 'All statuses' },
  { value: 'SCHEDULED',   label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'CANCELLED',   label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '',           label: 'All types' },
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'INSPECTION', label: 'Inspection' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SCHEDULED:   { bg: '#e3f2fd', color: '#1565c0' },
  IN_PROGRESS: { bg: '#fff8e1', color: '#e65100' },
  COMPLETED:   { bg: '#e0f8ef', color: '#00875a' },
  CANCELLED:   { bg: '#f5f5f5', color: '#757575' },
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  PREVENTIVE: { bg: '#e8f5e9', color: '#2e7d32' },
  CORRECTIVE: { bg: '#fce4ec', color: '#c62828' },
  INSPECTION: { bg: '#e3f2fd', color: '#1565c0' },
};

// Status actions: label, next status, and colour
const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string; needsForm?: boolean }[]> = {
  SCHEDULED:   [
    { label: 'Start',    next: 'IN_PROGRESS', color: '#e65100' },
    { label: 'Cancel',   next: 'CANCELLED',   color: '#757575' },
  ],
  IN_PROGRESS: [
    { label: 'Complete', next: 'COMPLETED', color: '#00875a', needsForm: true },
    { label: 'Cancel',   next: 'CANCELLED', color: '#757575' },
  ],
  COMPLETED:   [],
  CANCELLED:   [],
};

/* ── Badges ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {status.replace('_', ' ').charAt(0) + status.replace('_', ' ').slice(1).toLowerCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLE[type] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

/* ── Complete Modal ────────────────────────────────────────────────── */
function CompleteModal({
  record, onClose, onConfirm,
}: {
  record: MaintenanceRecord; onClose: () => void;
  onConfirm: (data: {
    completedDate: string; technicianName: string;
    laborCost: number; partsCost: number; notes: string;
  }) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [completedDate,   setCompletedDate]   = useState(today);
  const [technicianName,  setTechnicianName]  = useState(record.technicianName ?? '');
  const [laborCost,       setLaborCost]       = useState(record.laborCost  ?? 0);
  const [partsCost,       setPartsCost]       = useState(record.partsCost  ?? 0);
  const [notes,           setNotes]           = useState('');

  const totalCost = (laborCost || 0) + (partsCost || 0);

  const inputCls = "w-full text-sm px-3 rounded-lg outline-none";
  const inputStyle = { height: 36, border: '1px solid #e6e9ef' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} style={{ color: '#00897b' }} />
            <h2 className="text-base font-bold" style={{ color: '#323338' }}>Complete Maintenance</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: '#676879' }}>
          <span className="font-semibold">{record.productName ?? record.serialNumber}</span>
          {record.assetTag && <span> · {record.assetTag}</span>}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Completion Date
            </label>
            <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Technician Name
            </label>
            <input type="text" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Optional" className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
                Labor Cost (฿)
              </label>
              <input type="number" value={laborCost} min={0} step={100}
                onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
                Parts Cost (฿)
              </label>
              <input type="number" value={partsCost} min={0} step={100}
                onChange={(e) => setPartsCost(parseFloat(e.target.value) || 0)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          {totalCost > 0 && (
            <p className="text-xs font-semibold" style={{ color: '#323338' }}>
              Total: ฿{totalCost.toLocaleString()}
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Completion Notes
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Optional"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: '1px solid #e6e9ef' }} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border font-medium"
            style={{ borderColor: '#e6e9ef', color: '#676879' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ completedDate, technicianName, laborCost, partsCost, notes })}
            className="flex-1 py-2 text-sm rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#00897b' }}>
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New Maintenance Modal ─────────────────────────────────────────── */
type EquipItem = { id: string; serialNumber: string; assetTag: string | null; productName: string; brandName: string };

function NewMaintenanceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [equipSearch,    setEquipSearch]    = useState('');
  const [selectedEquipId, setSelectedEquipId] = useState('');
  const [type,           setType]           = useState('PREVENTIVE');
  const [scheduledDate,  setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [description,    setDesc]           = useState('');
  const [technicianName, setTech]           = useState('');
  const [loading,        setLoading]        = useState(false);

  const { data: equipData, isLoading: equipLoading } = useQuery({
    queryKey: ['equipment-all'],
    queryFn: async () => {
      const res  = await fetch('/api/equipment', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as EquipItem[];
    },
    staleTime: 60_000,
  });

  const allEquip = equipData ?? [];
  const filtered = allEquip.filter((e) => {
    if (!equipSearch) return true;
    const q = equipSearch.toLowerCase();
    return (
      e.serialNumber.toLowerCase().includes(q) ||
      (e.assetTag ?? '').toLowerCase().includes(q) ||
      e.productName.toLowerCase().includes(q)
    );
  }).slice(0, 30);

  const selectedEquip = allEquip.find((e) => e.id === selectedEquipId) ?? null;

  const inputCls  = 'w-full text-sm px-3 rounded-lg outline-none';
  const inputStyle = { height: 36, border: '1px solid #e6e9ef' };

  async function handleSubmit() {
    if (!selectedEquipId) { toast.error('Select equipment'); return; }
    if (!scheduledDate)   { toast.error('Scheduled date is required'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/maintenance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId:    selectedEquipId,
          type,
          scheduledDate,
          description:    description.trim()    || null,
          technicianName: technicianName.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Maintenance scheduled');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Wrench size={18} style={{ color: '#00897b' }} />
            <h2 className="text-base font-bold" style={{ color: '#323338' }}>Schedule Maintenance</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="space-y-3">
          {/* Equipment selector */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>Equipment *</label>
            {selectedEquip && !equipSearch ? (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ border: '1px solid #00897b', backgroundColor: '#e0f2f1' }}
              >
                <div>
                  <span className="text-sm font-semibold" style={{ color: '#323338' }}>{selectedEquip.productName}</span>
                  <span className="text-xs ml-2" style={{ color: '#676879' }}>
                    {selectedEquip.serialNumber}{selectedEquip.assetTag ? ` · ${selectedEquip.assetTag}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEquipId('')}
                  className="text-xs font-medium underline"
                  style={{ color: '#676879' }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={equipSearch}
                    onChange={(e) => setEquipSearch(e.target.value)}
                    placeholder="Search serial, model…"
                    className="w-full text-sm pl-8 pr-3 rounded-lg outline-none"
                    style={{ height: 36, border: '1px solid #e6e9ef' }}
                  />
                </div>
                <div
                  className="mt-1 rounded-lg overflow-y-auto"
                  style={{ border: '1px solid #e6e9ef', maxHeight: 144 }}
                >
                  {equipLoading ? (
                    <p className="text-xs p-3" style={{ color: '#b4b7c3' }}>Loading equipment…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-xs p-3" style={{ color: '#b4b7c3' }}>No equipment found</p>
                  ) : filtered.map((e, i) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { setSelectedEquipId(e.id); setEquipSearch(''); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #f5f6f8' : undefined,
                        backgroundColor: selectedEquipId === e.id ? '#e0f2f1' : undefined,
                      }}
                    >
                      <span className="font-semibold" style={{ color: '#323338' }}>{e.productName}</span>
                      <span className="text-xs ml-2" style={{ color: '#676879' }}>
                        {e.serialNumber}{e.assetTag ? ` · ${e.assetTag}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>

          {/* Scheduled date */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>Scheduled Date *</label>
            <input type="date" value={scheduledDate} onChange={(e) => setDate(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="What needs to be done…"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: '1px solid #e6e9ef' }}
            />
          </div>

          {/* Technician */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>Technician (optional)</label>
            <input type="text" value={technicianName} onChange={(e) => setTech(e.target.value)}
              placeholder="Technician name" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border font-medium"
            style={{ borderColor: '#e6e9ef', color: '#676879' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedEquipId}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#00897b' }}>
            {loading && <Loader2 size={13} className="animate-spin" />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────── */
function useMaintenance(filters: { status?: string; type?: string; search?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['maintenance', filters],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/list?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as MaintenanceRecord[];
    },
  });
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function MaintenancePage() {
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus]       = useState('');
  const [type, setType]           = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceRecord | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useMaintenance({
    ...(status    && { status }),
    ...(type      && { type }),
    ...(debounced && { search: debounced }),
  });

  const records: MaintenanceRecord[] = data ?? [];

  async function applyAction(id: string, next: string, extra?: Record<string, unknown>) {
    setActioning(id);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      await qc.invalidateQueries({ queryKey: ['maintenance'] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActioning(null);
      setCompleteTarget(null);
    }
  }

  function handleAction(record: MaintenanceRecord, action: typeof STATUS_ACTIONS[string][number]) {
    if (action.needsForm) { setCompleteTarget(record); return; }
    applyAction(record.id, action.next);
  }

  return (
    <div className="p-6 max-w-full">
      {completeTarget && (
        <CompleteModal
          record={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onConfirm={(data) => applyAction(completeTarget.id, 'COMPLETED', data)}
        />
      )}
      {showNewModal && (
        <NewMaintenanceModal
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false);
            qc.invalidateQueries({ queryKey: ['maintenance'] });
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg self-start sm:self-auto"
          style={{ backgroundColor: '#00897b' }}
        >
          <Plus size={15} />
          Schedule Maintenance
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between"
          style={{ backgroundColor: '#fce4ec', color: '#c62828' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial, technician…"
            className="pl-8 pr-3 text-sm rounded outline-none"
            style={{ height: 36, width: 220, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Completed</th>
                  <th>Technician</th>
                  <th>Description</th>
                  <th className="text-right">Total (฿)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const actions = STATUS_ACTIONS[r.status] ?? [];
                  const isBusy  = actioning === r.id;
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="text-sm font-semibold leading-snug">{r.productName ?? '—'}</p>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: '#676879' }}>
                          {r.serialNumber}
                          {r.assetTag && <span style={{ color: '#c4c4c4' }}> · {r.assetTag}</span>}
                        </p>
                      </td>
                      <td><TypeBadge type={r.type} /></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {r.scheduledDate ? formatDate(r.scheduledDate) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {r.completedDate ? formatDate(r.completedDate) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {r.technicianName ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm truncate max-w-[180px] block" style={{ color: '#676879' }}>
                          {r.description ?? '—'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-semibold">
                          {r.totalCost > 0 ? `฿${r.totalCost.toLocaleString()}` : '—'}
                        </span>
                        {r.totalCost > 0 && (
                          <p className="text-xs" style={{ color: '#676879' }}>
                            L:{r.laborCost.toLocaleString()} + P:{r.partsCost.toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td>
                        {actions.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {actions.map((a) => (
                              <button
                                key={a.next}
                                disabled={isBusy}
                                onClick={() => handleAction(r, a)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border transition-all hover:opacity-80 disabled:opacity-40"
                                style={{ borderColor: a.color, color: a.color }}
                              >
                                {isBusy ? '…' : a.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#c4c4c4' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {records.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <Wrench size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No maintenance records found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
