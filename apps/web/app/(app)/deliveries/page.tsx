'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { Search, Truck } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
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
};

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

function useDeliveries(filters: { status?: string; type?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['deliveries', filters],
    queryFn: async () => {
      const res = await fetch(`/api/deliveries?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as any[];
    },
  });
}

export default function DeliveriesPage() {
  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus]       = useState('');
  const [type, setType]           = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useDeliveries({
    ...(status && { status }),
    ...(type && { type }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(debounced && { search: debounced }),
  });

  const deliveries: any[] = data ?? [];

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Delivery Schedule</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${deliveries.length} schedule${deliveries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contract, customer, driver…"
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
                  <th>Contract</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Actual</th>
                  <th>Driver</th>
                  <th>Plate</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td><span className="font-mono text-sm font-semibold">{d.contractNumber}</span></td>
                    <td><span className="text-sm">{d.customerName}</span></td>
                    <td><TypeBadge type={d.type} /></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td><span className="text-sm" style={{ color: '#676879' }}>{d.scheduledDate ? formatDate(d.scheduledDate) : '—'}</span></td>
                    <td><span className="text-sm" style={{ color: '#676879' }}>{d.actualDate ? formatDate(d.actualDate) : '—'}</span></td>
                    <td>
                      <p className="text-sm" style={{ color: '#676879' }}>{d.driverName ?? '—'}</p>
                      {d.driverPhone && <p className="text-xs" style={{ color: '#c4c4c4' }}>{d.driverPhone}</p>}
                    </td>
                    <td><span className="text-sm font-mono" style={{ color: '#676879' }}>{d.vehiclePlate ?? '—'}</span></td>
                    <td>
                      <span className="text-sm truncate max-w-[160px] block" style={{ color: '#676879' }}>
                        {d.address ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
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
