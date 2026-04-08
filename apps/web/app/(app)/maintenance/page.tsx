'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { Search, Wrench } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED',   label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'CANCELLED',   label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
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

function useMaintenance(filters: { status?: string; type?: string; search?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['maintenance', filters],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/list?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as any[];
    },
  });
}

export default function MaintenancePage() {
  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus]       = useState('');
  const [type, setType]           = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useMaintenance({
    ...(status && { status }),
    ...(type && { type }),
    ...(debounced && { search: debounced }),
  });

  const records: any[] = data ?? [];

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

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

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
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
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
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
                    <td><span className="text-sm" style={{ color: '#676879' }}>{r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</span></td>
                    <td><span className="text-sm" style={{ color: '#676879' }}>{r.completedDate ? formatDate(r.completedDate) : '—'}</span></td>
                    <td><span className="text-sm" style={{ color: '#676879' }}>{r.technicianName ?? '—'}</span></td>
                    <td>
                      <span className="text-sm truncate max-w-[200px] block" style={{ color: '#676879' }}>
                        {r.description ?? '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-semibold">{r.totalCost > 0 ? r.totalCost.toLocaleString() : '—'}</span>
                    </td>
                  </tr>
                ))}
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
