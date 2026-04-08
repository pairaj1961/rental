'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { Search, Receipt } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT',   label: 'Draft' },
  { value: 'SENT',    label: 'Sent' },
  { value: 'PAID',    label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOID',    label: 'Void' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:   { bg: '#f5f6f8', color: '#676879' },
  SENT:    { bg: '#e3f2fd', color: '#1565c0' },
  PAID:    { bg: '#e0f8ef', color: '#00875a' },
  OVERDUE: { bg: '#fce4ec', color: '#c62828' },
  VOID:    { bg: '#f5f5f5', color: '#757575' },
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

function useInvoices(filters: { status?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as any[];
    },
  });
}

export default function InvoicesPage() {
  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useInvoices({
    ...(status && { status }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(debounced && { search: debounced }),
  });

  const invoices: any[] = data ?? [];
  const totalOutstanding = invoices
    .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
            {totalOutstanding > 0 && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded"
                style={{ backgroundColor: '#fce4ec', color: '#c62828' }}>
                ฿{totalOutstanding.toLocaleString()} outstanding
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, contract, customer…"
            className="pl-8 pr-3 text-sm rounded outline-none"
            style={{ height: 36, width: 250, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }} title="Invoice date from" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }} title="Due date to" />
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
                  <th>Invoice #</th>
                  <th>Contract</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className="text-right">Subtotal (฿)</th>
                  <th className="text-right">Tax (฿)</th>
                  <th className="text-right">Total (฿)</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span></td>
                    <td><span className="font-mono text-sm" style={{ color: '#676879' }}>{inv.contractNumber}</span></td>
                    <td><span className="text-sm">{inv.customerName}</span></td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td><span className="text-sm" style={{ color: '#676879' }}>{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</span></td>
                    <td>
                      <span className="text-sm"
                        style={{ color: inv.status === 'OVERDUE' ? '#c62828' : '#676879' }}>
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="text-right"><span className="text-sm">{inv.subtotal.toLocaleString()}</span></td>
                    <td className="text-right"><span className="text-sm" style={{ color: '#676879' }}>{inv.taxAmount.toLocaleString()}</span></td>
                    <td className="text-right"><span className="text-sm font-semibold">{inv.total.toLocaleString()}</span></td>
                    <td>
                      <span className="text-sm" style={{ color: '#676879' }}>
                        {inv.paidAt ? formatDate(inv.paidAt) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <Receipt size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No invoices found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
