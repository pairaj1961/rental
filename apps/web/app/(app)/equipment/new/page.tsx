'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { ArrowLeft, Package, Loader2, ChevronDown } from 'lucide-react';
import type { SharedProduct } from '@/lib/shared-db';

// ── hooks ─────────────────────────────────────────────────────────────────

function useSharedProducts() {
  return useQuery({
    queryKey: ['shared-products'],
    queryFn: async () => {
      const res = await fetch('/api/shared/products', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load products');
      return json.data as SharedProduct[];
    },
  });
}

// ── helpers ───────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent — like new, no visible wear' },
  { value: 'GOOD',      label: 'Good — minor wear, fully functional' },
  { value: 'FAIR',      label: 'Fair — visible wear, needs monitoring' },
  { value: 'POOR',      label: 'Poor — significant wear, needs attention' },
];

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#b4b7c3' }}>{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border rounded px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400"
      style={{ borderColor: '#e6e9ef', height: 38 }}
      onFocus={(e) => { if (!disabled) e.target.style.borderColor = '#00897b'; }}
      onBlur={(e) => { e.target.style.borderColor = '#e6e9ef'; }}
    />
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function NewEquipmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useSharedProducts();

  // Group products by category for the select
  const byCategory = products.reduce<Record<string, SharedProduct[]>>((acc, p) => {
    const key = p.categoryName;
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Derived info from selected product
  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { toast.error('Please select a product'); return; }
    if (!serialNumber.trim()) { toast.error('Serial number is required'); return; }

    setIsPending(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          serialNumber: serialNumber.trim(),
          assetTag: assetTag.trim() || undefined,
          condition,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          currentLocation: currentLocation.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create equipment');

      qc.invalidateQueries({ queryKey: ['rental-equipment'] });
      toast.success('Equipment added successfully');
      router.push(`/equipment/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred');
    } finally {
      setIsPending(false);
    }
  };

  // Redirect non-managers
  if (user && !['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(user.role)) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#676879' }}>
        You don't have permission to add equipment.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={15} />
        Back to Equipment
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#e0f2f1' }}
        >
          <Package size={20} style={{ color: '#00897b' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#323338' }}>Add Equipment</h1>
          <p className="text-sm" style={{ color: '#676879' }}>Register a new rental asset</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Product selection ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>
            Product
          </h2>

          <Field label="Select Product" required>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm outline-none"
              style={{ height: 38, borderColor: '#e6e9ef' }}
              disabled={productsLoading}
            >
              <option value="">{productsLoading ? 'Loading products…' : '— Select a product —'}</option>
              {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, prods]) => (
                <optgroup key={cat} label={cat}>
                  {prods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.modelName}{p.sku ? ` (${p.sku})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          {/* Auto-filled product info */}
          {selectedProduct && (
            <div
              className="grid grid-cols-2 gap-3 p-3 rounded-lg text-sm"
              style={{ backgroundColor: '#f5f6f8' }}
            >
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: '#b4b7c3' }}>Brand</p>
                <p className="font-medium mt-0.5">{selectedProduct.brandName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: '#b4b7c3' }}>Category</p>
                <p className="font-medium mt-0.5">{selectedProduct.categoryName}</p>
              </div>
              {selectedProduct.rentalDailyRate > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase" style={{ color: '#b4b7c3' }}>Daily Rate</p>
                  <p className="font-medium mt-0.5">฿{selectedProduct.rentalDailyRate.toLocaleString()}</p>
                </div>
              )}
              {selectedProduct.modelNumber && (
                <div>
                  <p className="text-xs font-medium uppercase" style={{ color: '#b4b7c3' }}>Model No.</p>
                  <p className="font-medium mt-0.5">{selectedProduct.modelNumber}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Asset identification ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>
            Asset Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Serial Number" required hint="Must be unique across all equipment">
              <Input
                value={serialNumber}
                onChange={setSerialNumber}
                placeholder="e.g. SN-2024-00123"
              />
            </Field>
            <Field label="Asset Tag" hint="Internal tracking code (optional)">
              <Input
                value={assetTag}
                onChange={setAssetTag}
                placeholder="e.g. TA-EQ-001"
              />
            </Field>
          </div>
        </div>

        {/* ── Condition & purchase ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>
            Condition & Purchase
          </h2>

          <Field label="Condition" required>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm outline-none"
              style={{ height: 38, borderColor: '#e6e9ef' }}
            >
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Purchase Date">
              <Input
                type="date"
                value={purchaseDate}
                onChange={setPurchaseDate}
              />
            </Field>
            <Field label="Purchase Price (฿)">
              <Input
                type="number"
                value={purchasePrice}
                onChange={setPurchasePrice}
                placeholder="0.00"
              />
            </Field>
          </div>
        </div>

        {/* ── Location & notes ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>
            Location & Notes
          </h2>

          <Field label="Current Location" hint="Warehouse bay, job site, or address">
            <Input
              value={currentLocation}
              onChange={setCurrentLocation}
              placeholder="e.g. Warehouse A, Bay 3"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relevant notes about this equipment…"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm outline-none resize-none transition-colors"
              style={{ borderColor: '#e6e9ef' }}
              onFocus={(e) => { e.target.style.borderColor = '#00897b'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e6e9ef'; }}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#e6e9ef', color: '#323338' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || productsLoading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#00897b' }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'Adding…' : 'Add Equipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
