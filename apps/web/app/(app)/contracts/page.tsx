'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { Plus, Search, FileText } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Contract = {
  id: string;
  contractNumber: string;
  status: string;
  paymentStatus: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  customerName: string;
  siteName: string | null;
  assignedRepName: string | null;
  assignedRepId: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'EXTENDED',  label: 'Extended' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const CONTRACT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#f5f6f8', color: '#676879' },
  ACTIVE:    { bg: '#e0f8ef', color: '#00875a' },
  EXTENDED:  { bg: '#e3f2fd', color: '#1565c0' },
  COMPLETED: { bg: '#e8f5e9', color: '#2e7d32' },
  CANCELLED: { bg: '#fce4ec', color: '#c62828' },
};

const PAYMENT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  UNPAID:  { bg: '#fff8e1', color: '#e65100' },
  PAID:    { bg: '#e0f8ef', color: '#00875a' },
  PARTIAL: { bg: '#e3f2fd', color: '#1565c0' },
  OVERDUE: { bg: '#fce4ec', color: '#c62828' },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useContracts(filters: {
  status?: string; assignedRep?: string;
  dateFrom?: string; dateTo?: string; search?: string;
}) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['rental-contracts', filters],
    queryFn: async () => {
      const res  = await fetch(`/api/contracts?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as Contract[];
    },
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = CONTRACT_STATUS_STYLE[status] ?? { bg: '#f5f6f8', color: '#676879' };
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS_STYLE[status] ?? { bg: '#f5f6f8', color: '#676879' };
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { user } = useAuth();
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [status, setStatus]           = useState('');
  const [assignedRep, setAssignedRep] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useContracts({
    ...(status && { status }),
    ...(assignedRep && { assignedRep }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const contracts: Contract[] = data ?? [];
  const reps = [...new Set(
    contracts.map((c) => c.assignedRepId && c.assignedRepName
      ? JSON.stringify({ id: c.assignedRepId, name: c.assignedRepName })
      : null
    ).filter(Boolean)
  )].map((s) => JSON.parse(s as string));

  const canCreate = ['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'REP', 'SALES_REP']
    .includes(user?.role ?? '');

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${contracts.length} contract${contracts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00897b' }}
          >
            <Plus size={16} />
            New Contract
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, customer…"
            className="pl-8 pr-3 text-sm rounded outline-none"
            style={{ height: 36, width: 220, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {reps.length > 0 && (
          <select
            value={assignedRep}
            onChange={(e) => setAssignedRep(e.target.value)}
            className="text-sm px-3 rounded outline-none"
            style={{ height: 36, border: '1px solid #e6e9ef' }}
          >
            <option value="">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
          title="Start date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
          title="End date to"
        />
      </div>

      {/* Table */}
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
                  <th>Contract #</th>
                  <th>Customer / Site</th>
                  <th>Assigned Rep</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Start</th>
                  <th>End</th>
                  <th className="text-right">Total (฿)</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono text-sm font-semibold">{c.contractNumber}</span>
                    </td>
                    <td>
                      <p className="text-sm font-semibold leading-snug">{c.customerName}</p>
                      {c.siteName && (
                        <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{c.siteName}</p>
                      )}
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: '#676879' }}>
                        {c.assignedRepName ?? <span style={{ color: '#c4c4c4' }}>—</span>}
                      </span>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><PaymentBadge status={c.paymentStatus} /></td>
                    <td>
                      <span className="text-sm" style={{ color: '#676879' }}>
                        {c.startDate ? formatDate(c.startDate) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: '#676879' }}>
                        {c.endDate ? formatDate(c.endDate) : '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-semibold">
                        {c.totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/contracts/${c.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-teal-50 hover:border-teal-200"
                        style={{ borderColor: '#e6e9ef', color: '#00897b' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contracts.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <FileText size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No contracts found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
