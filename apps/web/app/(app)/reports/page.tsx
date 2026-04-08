'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { RentalStatusBadge } from '@/components/shared/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Download, BarChart2, TrendingUp, Users } from 'lucide-react';

/* ── CSV export helper ──────────────────────────────────────────── */
function exportCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
  ORDER_RECEIVED: '#fdab3d', PREPARING: '#579bfc', DELIVERED: '#9b59b6',
  ACTIVE: '#00c875', RETURNING: '#e67e22', CLOSED: '#c4c4c4', CANCELLED: '#e44258',
};

const TABS = [
  { key: 'rental-summary',  label: 'Rental Summary',  icon: <BarChart2 size={14} /> },
  { key: 'equipment-usage', label: 'Equipment Usage',  icon: <TrendingUp size={14} /> },
  { key: 'customers',       label: 'Customers',        icon: <Users size={14} /> },
];

export default function ReportsPage() {
  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [from, setFrom] = useState(sixMonthsAgo);
  const [to, setTo]     = useState(todayStr);
  const [activeReport, setActiveReport] = useState<'rental-summary' | 'equipment-usage' | 'customers'>('rental-summary');

  const params = `from=${from}&to=${to}`;

  /* Eagerly load all three reports */
  async function fetchReport(path: string) {
    const res = await fetch(`${path}?${params}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed');
    return json.data;
  }

  const { data: rentalSummary, isLoading: loadingRental } = useQuery({
    queryKey: ['report-rental-summary', from, to],
    queryFn: () => fetchReport('/api/reports/rental-summary'),
  });

  const { data: equipmentUsage, isLoading: loadingEquip } = useQuery({
    queryKey: ['report-equipment-usage', from, to],
    queryFn: () => fetchReport('/api/reports/equipment-usage'),
  });

  const { data: customerReport, isLoading: loadingCustomer } = useQuery({
    queryKey: ['report-customers', from, to],
    queryFn: () => fetchReport('/api/reports/customers'),
  });

  const isLoading = loadingRental || loadingEquip || loadingCustomer;

  const handleExport = () => {
    if (activeReport === 'rental-summary' && rentalSummary?.rentals) {
      exportCSV(`rental-summary-${from}-${to}.csv`, [
        ['Ref#', 'Customer', 'Equipment', 'Status', 'Start Date', 'End Date'],
        ...rentalSummary.rentals.map((r: any) => [
          r.rentalNumber, r.customer?.companyName ?? '', r.equipment?.modelName ?? '',
          r.status, r.rentalStartDate ? formatDate(r.rentalStartDate) : '', r.rentalEndDate ? formatDate(r.rentalEndDate) : '',
        ]),
      ]);
    } else if (activeReport === 'equipment-usage' && equipmentUsage?.items) {
      exportCSV(`equipment-usage-${from}-${to}.csv`, [
        ['Equipment', 'Serial #', 'Category', 'Rentals', 'Total Days'],
        ...equipmentUsage.items.map((eq: any) => [
          eq.modelName, eq.serialNumber, eq.category ?? '', eq.rentalCount, eq.totalDays ?? 0,
        ]),
      ]);
    } else if (activeReport === 'customers' && customerReport?.customers) {
      exportCSV(`customer-report-${from}-${to}.csv`, [
        ['Company', 'Contact', 'Total Rentals', 'Active', 'Closed', 'Cancelled'],
        ...customerReport.customers.map((c: any) => [
          c.companyName, c.contactPerson ?? '', c.totalRentals, c.activeRentals, c.completedRentals, c.cancelledRentals,
        ]),
      ]);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Analytics & Summary</p>
      </div>

      {/* Date range filter */}
      <div className="card p-4 flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-semibold" style={{ color: '#676879' }}>Date Range</span>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="text-sm rounded px-3"
          style={{ height: 34, border: '1px solid #e6e9ef' }}
        />
        <span className="text-sm" style={{ color: '#676879' }}>→</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="text-sm rounded px-3"
          style={{ height: 34, border: '1px solid #e6e9ef' }}
        />
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:bg-teal-50 hover:border-teal-300"
          style={{ borderColor: '#00897b', color: '#00897b' }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: '#e6e9ef' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key as any)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeReport === tab.key ? '#00897b' : '#676879',
              borderBottom: activeReport === tab.key ? '2px solid #00897b' : '2px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      )}

      {/* ── Rental Summary ── */}
      {activeReport === 'rental-summary' && !loadingRental && rentalSummary && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total',     value: rentalSummary.total     ?? 0, color: '#1565c0', bg: '#e3f2fd' },
              { label: 'Active',    value: rentalSummary.active    ?? 0, color: '#006b5e', bg: '#e0f2f1' },
              { label: 'Closed',    value: rentalSummary.closed    ?? 0, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'Cancelled', value: rentalSummary.cancelled ?? 0, color: '#c62828', bg: '#fce4ec' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs font-semibold mt-1 uppercase tracking-wide" style={{ color: '#676879' }}>{label}</p>
              </div>
            ))}
          </div>

          {rentalSummary.byStatus?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4" style={{ color: '#323338' }}>Rentals by Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rentalSummary.byStatus} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#676879' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#676879' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                  />
                  <Bar dataKey="count" name="Rentals" radius={[6, 6, 0, 0]}>
                    {rentalSummary.byStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? '#00897b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rentalSummary.rentals?.length > 0 && (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Customer</th>
                    <th>Equipment</th>
                    <th>Status</th>
                    <th>Start</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalSummary.rentals.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.rentalNumber}</td>
                      <td className="text-sm">{r.customer?.companyName}</td>
                      <td className="text-sm">{r.equipment?.modelName}</td>
                      <td><RentalStatusBadge status={r.status} /></td>
                      <td className="text-sm" style={{ color: '#676879' }}>{formatDate(r.rentalStartDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Equipment Usage ── */}
      {activeReport === 'equipment-usage' && !loadingEquip && equipmentUsage && (
        <div className="space-y-6 animate-fade-in">
          {equipmentUsage.items?.length > 0 ? (
            <>
              <div className="card p-5">
                <h3 className="text-sm font-bold mb-4" style={{ color: '#323338' }}>Rentals per Equipment</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, equipmentUsage.items.length * 36)}>
                  <BarChart data={equipmentUsage.items} barSize={24} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#676879' }} />
                    <YAxis dataKey="modelName" type="category" width={130} tick={{ fontSize: 11, fill: '#676879' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                    />
                    <Bar dataKey="rentalCount" name="Rentals" fill="#579bfc" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Serial #</th>
                      <th>Category</th>
                      <th>Rentals</th>
                      <th>Total Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentUsage.items.map((eq: any) => (
                      <tr key={eq.id}>
                        <td className="text-sm font-semibold">{eq.modelName}</td>
                        <td className="font-mono text-xs" style={{ color: '#676879' }}>{eq.serialNumber}</td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f6f8', color: '#676879' }}>
                            {eq.category ?? '—'}
                          </span>
                        </td>
                        <td className="text-sm font-semibold" style={{ color: '#1565c0' }}>{eq.rentalCount}</td>
                        <td className="text-sm" style={{ color: '#676879' }}>
                          {eq.totalDays != null ? `${eq.totalDays} days` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-sm" style={{ color: '#676879' }}>
              <TrendingUp size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No equipment usage data</p>
              <p className="text-xs mt-1 opacity-60">Try expanding the date range</p>
            </div>
          )}
        </div>
      )}

      {/* ── Customer Report ── */}
      {activeReport === 'customers' && !loadingCustomer && customerReport && (
        <div className="animate-fade-in">
          {customerReport.customers?.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">Active</th>
                    <th className="text-center">Closed</th>
                    <th className="text-center">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReport.customers.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <p className="text-sm font-semibold">{c.companyName}</p>
                        {c.contactPerson && (
                          <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{c.contactPerson}</p>
                        )}
                      </td>
                      <td className="text-center text-sm font-bold">{c.totalRentals}</td>
                      <td className="text-center text-sm font-semibold" style={{ color: '#006b5e' }}>{c.activeRentals}</td>
                      <td className="text-center text-sm font-semibold" style={{ color: '#2e7d32' }}>{c.completedRentals}</td>
                      <td className="text-center text-sm font-semibold" style={{ color: '#c62828' }}>{c.cancelledRentals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-sm" style={{ color: '#676879' }}>
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No customer data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
