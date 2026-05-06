'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Search, Receipt, ChevronRight, X } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface Invoice {
  id: string;
  invoiceNumber: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  status: string;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paidAt: string | null;
  paidAmount: number | null;
  createdAt: string;
}

/* ── Constants ─────────────────────────────────────────────────────── */
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

// What actions can be taken from each status
const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  DRAFT:   [{ label: 'Mark Sent',    next: 'SENT',    color: '#1565c0' },
            { label: 'Void',         next: 'VOID',    color: '#757575' }],
  SENT:    [{ label: 'Mark Paid',    next: 'PAID',    color: '#00875a' },
            { label: 'Mark Overdue', next: 'OVERDUE', color: '#c62828' },
            { label: 'Void',         next: 'VOID',    color: '#757575' }],
  OVERDUE: [{ label: 'Mark Paid',    next: 'PAID',    color: '#00875a' },
            { label: 'Void',         next: 'VOID',    color: '#757575' }],
  PAID:    [],
  VOID:    [],
};

/* ── Badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/* ── Mark-Paid Modal ───────────────────────────────────────────────── */
function MarkPaidModal({
  invoice, onClose, onConfirm,
}: {
  invoice: Invoice; onClose: () => void; onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(invoice.total);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#323338' }}>Mark as Paid</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: '#676879' }}>
          Invoice <span className="font-mono font-semibold">{invoice.invoiceNumber}</span> —
          total <span className="font-semibold">฿{invoice.total.toLocaleString()}</span>
        </p>

        <label className="block text-xs font-semibold mb-1" style={{ color: '#676879' }}>
          Paid Amount (฿)
        </label>
        <input
          type="number"
          value={amount}
          min={0}
          step={0.01}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="w-full text-sm px-3 rounded-lg outline-none mb-5"
          style={{ height: 38, border: '1px solid #e6e9ef' }}
        />

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border font-medium"
            style={{ borderColor: '#e6e9ef', color: '#676879' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(amount)}
            className="flex-1 py-2 text-sm rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#00897b' }}>
            Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────── */
function useInvoices(filters: { status?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as Invoice[];
    },
  });
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [paidModal, setPaidModal] = useState<Invoice | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useInvoices({
    ...(status   && { status }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo   && { dateTo }),
    ...(debounced && { search: debounced }),
  });

  const invoices: Invoice[] = data ?? [];

  const totalOutstanding = invoices
    .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + i.total, 0);

  async function applyAction(invoiceId: string, next: string, paidAmount?: number) {
    setActioning(invoiceId);
    setError(null);
    try {
      const body: Record<string, unknown> = { status: next };
      if (paidAmount != null) body.paidAmount = paidAmount;

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      await qc.invalidateQueries({ queryKey: ['invoices'] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActioning(null);
      setPaidModal(null);
    }
  }

  function handleAction(inv: Invoice, next: string) {
    if (next === 'PAID') { setPaidModal(inv); return; }
    applyAction(inv.id, next);
  }

  return (
    <div className="p-6 max-w-full">
      {paidModal && (
        <MarkPaidModal
          invoice={paidModal}
          onClose={() => setPaidModal(null)}
          onConfirm={(amt) => applyAction(paidModal.id, 'PAID', amt)}
        />
      )}

      {/* Header */}
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
            placeholder="Invoice #, contract, customer…"
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
                  <th>Invoice #</th>
                  <th>Contract</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className="text-right">Total (฿)</th>
                  <th>Paid At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const actions = STATUS_ACTIONS[inv.status] ?? [];
                  const isBusy  = actioning === inv.id;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span>
                      </td>
                      <td>
                        <Link
                          href={`/contracts/${inv.contractId}`}
                          className="font-mono text-sm hover:underline flex items-center gap-0.5"
                          style={{ color: '#00897b' }}
                        >
                          {inv.contractNumber}
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                      <td><span className="text-sm">{inv.customerName}</span></td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <span className="text-sm" style={{ color: '#676879' }}>
                          {inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{
                          color: inv.status === 'OVERDUE' ? '#c62828' : '#676879',
                          fontWeight: inv.status === 'OVERDUE' ? 600 : 400,
                        }}>
                          {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div>
                          <p className="text-sm font-semibold">{inv.total.toLocaleString()}</p>
                          {inv.taxAmount > 0 && (
                            <p className="text-xs" style={{ color: '#676879' }}>
                              incl. ฿{inv.taxAmount.toLocaleString()} VAT
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm" style={{ color: '#676879' }}>
                            {inv.paidAt ? formatDate(inv.paidAt) : '—'}
                          </p>
                          {inv.paidAmount != null && (
                            <p className="text-xs font-medium" style={{ color: '#00875a' }}>
                              ฿{inv.paidAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        {actions.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {actions.map((a) => (
                              <button
                                key={a.next}
                                disabled={isBusy}
                                onClick={() => handleAction(inv, a.next)}
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
