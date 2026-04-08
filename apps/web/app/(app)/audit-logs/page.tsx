'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { Search, Shield } from 'lucide-react';

const ENTITY_OPTIONS = [
  { value: '',                  label: 'All entities' },
  { value: 'RentalOrder',       label: 'Rental Order' },
  { value: 'Equipment',         label: 'Equipment' },
  { value: 'Customer',          label: 'Customer' },
  { value: 'User',              label: 'User' },
  { value: 'InspectionReport',  label: 'Inspection' },
  { value: 'MaintenanceLog',    label: 'Maintenance' },
];

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  create: { label: 'Create', bg: '#e0f2f1', color: '#006b5e' },
  update: { label: 'Update', bg: '#e3f2fd', color: '#1565c0' },
  delete: { label: 'Delete', bg: '#fce4ec', color: '#c62828' },
};

const ENTITY_ICONS: Record<string, string> = {
  RentalOrder:      '📋',
  Equipment:        '🔧',
  Customer:         '🏢',
  User:             '👤',
  InspectionReport: '✅',
  MaintenanceLog:   '🛠️',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '50' });
  if (entityType) params.set('entityType', entityType);
  if (search)     params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityType, search],
    queryFn: () => api.get<any>(`/api/v1/audit-logs?${params}`),
  });

  const logs: any[] = data?.items ?? data ?? [];
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? logs.length;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={20} style={{ color: '#00897b' }} />
          <h1 className="page-title" style={{ margin: 0 }}>Audit Log</h1>
        </div>
        <p className="page-subtitle">
          {isLoading ? 'Loading…' : `${total} entries · System change history`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 card">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by actor or entity…"
            className="pl-8 pr-3 text-sm rounded w-full"
            style={{ height: 36, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="text-sm px-2 rounded"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
        >
          {ENTITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const actionCfg = ACTION_CONFIG[log.action] ?? { label: log.action, bg: '#f5f6f8', color: '#676879' };
                  const icon = ENTITY_ICONS[log.entityType] ?? '📄';
                  return (
                    <tr key={log.id}>
                      <td>
                        <p className="text-xs font-mono whitespace-nowrap" style={{ color: '#676879' }}>
                          {formatDateTime(log.timestamp ?? log.createdAt)}
                        </p>
                      </td>
                      <td>
                        <p className="text-sm font-semibold">{log.actorName ?? '—'}</p>
                        {log.actorRole && (
                          <p className="text-xs mt-0.5 capitalize" style={{ color: '#676879' }}>
                            {log.actorRole.toLowerCase()}
                          </p>
                        )}
                      </td>
                      <td>
                        <span
                          className="text-xs font-bold uppercase px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: actionCfg.bg, color: actionCfg.color }}
                        >
                          {actionCfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <div>
                            <p className="text-sm font-medium">{log.entityType}</p>
                            <p
                              className="font-mono text-xs truncate max-w-[100px]"
                              style={{ color: '#b4b7c3' }}
                              title={log.entityId}
                            >
                              {log.entityId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {(log.beforeValue || log.afterValue) && (
                          <details className="text-xs">
                            <summary
                              className="cursor-pointer text-xs font-medium hover:underline"
                              style={{ color: '#0073ea' }}
                            >
                              View diff
                            </summary>
                            <div className="mt-2 grid grid-cols-2 gap-2" style={{ minWidth: 280 }}>
                              {log.beforeValue && (
                                <div>
                                  <p className="text-[10px] font-bold mb-1" style={{ color: '#c62828' }}>Before</p>
                                  <pre
                                    className="p-2 rounded text-[10px] overflow-auto max-h-28"
                                    style={{ backgroundColor: '#fff5f6', color: '#323338' }}
                                  >
                                    {JSON.stringify(log.beforeValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.afterValue && (
                                <div>
                                  <p className="text-[10px] font-bold mb-1" style={{ color: '#006b5e' }}>After</p>
                                  <pre
                                    className="p-2 rounded text-[10px] overflow-auto max-h-28"
                                    style={{ backgroundColor: '#f0fff4', color: '#323338' }}
                                  >
                                    {JSON.stringify(log.afterValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <Shield size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No audit records</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#e6e9ef' }}>
              <span className="text-xs" style={{ color: '#676879' }}>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#e6e9ef' }}
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#e6e9ef' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
