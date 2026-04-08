'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Package, MapPin } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',            label: 'All statuses' },
  { value: 'AVAILABLE',   label: 'Available' },
  { value: 'RENTED',      label: 'Rented' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED',     label: 'Retired' },
];

const CONDITION_OPTIONS = [
  { value: '',          label: 'All conditions' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD',      label: 'Good' },
  { value: 'FAIR',      label: 'Fair' },
  { value: 'POOR',      label: 'Poor' },
];

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

// ── Hooks ────────────────────────────────────────────────────────────────────

function useEquipmentRental(filters: {
  status?: string; brand?: string; condition?: string; search?: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  return useQuery({
    queryKey: ['rental-equipment', filters],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      return json.data as any[];
    },
  });
}

// ── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const s = CONDITION_STYLE[condition] ?? { bg: '#f5f5f5', color: '#757575' };
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {condition.charAt(0) + condition.slice(1).toLowerCase()}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useEquipmentRental({
    ...(status && { status }),
    ...(brand && { brand }),
    ...(condition && { condition }),
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const equipment: any[] = data ?? [];

  // Derive distinct brand names from loaded data for the filter dropdown
  const brands = [...new Set(equipment.map((e) => e.brandName).filter(Boolean))].sort();

  const canAdd = ['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(user?.role ?? '');

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Equipment</h1>
          <p className="page-subtitle">
            {isLoading ? '…' : `${equipment.length} item${equipment.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canAdd && (
          <Link
            href="/equipment/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00897b' }}
          >
            <Plus size={16} />
            Add Equipment
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
            placeholder="Search model, serial, tag…"
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
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="text-sm px-3 rounded outline-none"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
        >
          {CONDITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {brands.length > 0 && (
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="text-sm px-3 rounded outline-none"
            style={{ height: 36, border: '1px solid #e6e9ef' }}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Serial Number</th>
                  <th>Product / Brand</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => (
                  <tr key={eq.id}>
                    <td>
                      <span className="font-mono text-sm font-medium">
                        {eq.assetTag ?? <span style={{ color: '#c4c4c4' }}>—</span>}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-sm" style={{ color: '#676879' }}>
                        {eq.serialNumber}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-semibold leading-snug">{eq.productName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#676879' }}>
                        {eq.brandName}
                        {eq.categoryName && (
                          <span style={{ color: '#c4c4c4' }}> · {eq.categoryName}</span>
                        )}
                      </p>
                    </td>
                    <td>
                      <ConditionBadge condition={eq.condition} />
                    </td>
                    <td>
                      <StatusBadge status={eq.status} />
                    </td>
                    <td>
                      {eq.currentLocation ? (
                        <div className="flex items-center gap-1 text-sm" style={{ color: '#676879' }}>
                          <MapPin size={12} />
                          <span className="truncate max-w-[140px]">{eq.currentLocation}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#c4c4c4' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/equipment/${eq.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-teal-50 hover:border-teal-200"
                        style={{ borderColor: '#e6e9ef', color: '#00897b' }}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {equipment.length === 0 && (
              <div className="text-center py-16" style={{ color: '#676879' }}>
                <Package size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No equipment found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
