'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Search, Truck, ChevronRight, X, CheckCircle2 } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface Delivery {
  id: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  type: string;
  status: string;
  scheduledDate: string | null;
  actualDate: string | null;
  address: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  notes: string | null;
  createdAt: string;
}

/* ── Constants ─────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'OVERDUE',   label: 'Overdue' },
];

const TYPE_OPTIONS = [
  { value: '',         label: 'All types' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'RETURN',   label: 'Return' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: '#e3f2fd', color: '#1565c0' },
  COMPLETED: { bg: '#e0f8ef', color: '#00875a' },
  CANCELLED: { bg: '#f5f5f5', color: '#757575' },
  OVERDUE:   { bg: '#fce4ec', color: '#c62828' },
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  DELIVERY: { bg: '#e0f8ef', color: '#00875a' },
  RETURN:   { bg: '#fff8e1', color: '#e65100' },
  TRANSFER: { bg: '#f3e5f5', color: '#6a1b9a' },
};

/* ── Badges ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
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
  delivery, onClose, onConfirm,
}: {
  delivery: Delivery; onClose: () => void;
  onConfirm: (data: { actualDate: string; driverName: string; vehiclePlate: string }) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [actualDate,   setActualDate]   = useState(today);
  const [driverName,   setDriverName]   = useState(delivery.driverName ?? '');
  const [vehiclePlate, setVehiclePlate] = useState(delivery.vehiclePlate ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} style={{ color: '#00897b' }} />
            <h2 className="text-base font-bold" style={{ color: '#323338' }}>Complete Delivery</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: '#676879' }}>
          Contract <span className="font-mono font-semibold">{delivery.contractNumber}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Actual Date
            </label>
            <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)}
              className="w-full text-sm px-3 rounded-lg outline-none"
              style={{ height: 36, border: '1px solid #e6e9ef' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Driver Name
            </label>
            <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)}
              placeholder="Optional"
              className="w-full text-sm px-3 rounded-lg outline-none"
              style={{ height: 36, border: '1px solid #e6e9ef' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
              Vehicle Plate
            </label>
            <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Optional"
              className="w-full text-sm px-3 rounded-lg outline-none"
              style={{ height: 36, border: '1px solid #e6e9ef' }} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border font-medium"
            style={{ borderColor: '#e6e9ef', color: '#676879' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ actualDate, driverName, vehiclePlate })}
            className="flex-1 py-2 text-sm rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#00897b' }}>
            Confirm Complete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────── */
function useDeliveries(filters: {
  status?: string; type?: string; dateFrom?: string; dateTo?: string; search?: string;
}) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['deliveries', filters],
    queryFn: async () => {
      const res = await fetch(`/api/deliveries?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as Delivery[];
    },
  });
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function DeliveriesPage() {
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [debounced, setDebounced]   = useState('');
  const [status, setStatus]         = useState('');
  const [type, setType]             = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [actioning, setActioning]   = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Delivery | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useDeliveries({
    ...(status   && { status }),
    ...(type     && { type }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo   && { dateTo }),
    ...(debounced && { search: debounced }),
  });

  const deliveries: Delivery[] = data ?? [];

  async function applyAction(
    id: string,
    next: string,
    extra?: { actualDate: string; driverName: string; vehiclePlate: string },
  ) {
    setActioning(id);
    setError(null);
    try {
      const body: Record<string, unknown> = { status: next, ...extra };
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      await qc.invalidateQueries({ queryKey: ['deliveries'] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActioning(null);
      setCompleteTarget(null);
    }
  }

  return (
    <div className="p-6 max-w-full">
      {completeTarget && (
        <CompleteModal
          delivery={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onConfirm={(data) => applyAction(completeTarget.id, 'COMPLETED', data)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Delivery Schedule</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${deliveries.length} schedule${deliveries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
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
            placeholder="Contract, customer, driver…"
            className="pl-8 pr-3 text-sm rounded outline-none"
            style={{ height: 36, width: 240, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }} title="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }} title="To date" />
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
                  <th>Contract</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Actual</th>
                  <th>Driver</th>
                  <th>Plate</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const canAct   = ['SCHEDULED', 'OVERDUE'].includes(d.status);
                  const isBusy   = actioning === d.id;
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link
                          href={`/contracts/${d.contractId}`}
                          className="font-mono text-sm font-semibold hover:underline flex items-center gap-0.5"
                          style={{ color: '#00897b' }}
                        >
                          {d.contractNumber}
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                      <td><span className="text-sm">{d.customerName}</span></td>
                      <td><TypeBadge type={d.type} /></td>
                      <td><StatusBadge status={d.status} /></td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {d.scheduledDate ? formatDate(d.scheduledDate) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {d.actualDate ? formatDate(d.actualDate) : '—'}
                        </span>
                      </td>
                      <td>
                        <p className="text-sm" style={{ color: '#676879' }}>{d.driverName ?? '—'}</p>
                        {d.driverPhone && (
                          <p className="text-xs" style={{ color: '#c4c4c4' }}>{d.driverPhone}</p>
                        )}
                      </td>
                      <td>
                        <span className="text-sm font-mono" style={{ color: '#676879' }}>
                          {d.vehiclePlate ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm truncate max-w-[140px] block" style={{ color: '#676879' }}>
                          {d.address ?? '—'}
                        </span>
                      </td>
                      <td>
                        {canAct ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={isBusy}
                              onClick={() => setCompleteTarget(d)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border transition-all hover:opacity-80 disabled:opacity-40"
                              style={{ borderColor: '#00875a', color: '#00875a' }}
                            >
                              {isBusy ? '…' : 'Complete'}
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => applyAction(d.id, 'CANCELLED')}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border transition-all hover:opacity-80 disabled:opacity-40"
                              style={{ borderColor: '#757575', color: '#757575' }}
                            >
                              {isBusy ? '…' : 'Cancel'}
                            </button>
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

            {deliveries.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <Truck size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No deliveries found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
