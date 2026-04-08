'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Check, Plus, X, Loader2 } from 'lucide-react';
import type { SharedProduct } from '@/lib/shared-db';

// ── Types ─────────────────────────────────────────────────────────────────────

type Customer   = { id: string; companyName: string; phone: string };
type Site       = { id: string; siteName: string; siteAddress: string };
type RepUser    = { id: string; firstName: string; lastName: string; role: string };
type Quote      = { id: string; quoteNumber: string; lineItems: { productId: string; productName: string; quantity: number; unitPrice: number }[] };
type Equipment  = {
  id: string; serialNumber: string; assetTag: string | null;
  productName: string; brandName: string; categoryName: string;
  condition: string; productId: string;
  rentalDailyRate: number; rentalWeeklyRate: number; rentalMonthlyRate: number;
};

type SelectedItem = {
  equipmentId: string; serialNumber: string; assetTag: string | null;
  productName: string; brandName: string;
  agreedRate: string; agreedRateType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCustomers() {
  return useQuery({
    queryKey: ['shared-customers'],
    queryFn: async () => {
      const res  = await fetch('/api/shared/customers', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as Customer[];
    },
  });
}

function useCustomerSites(customerId: string) {
  return useQuery({
    queryKey: ['customer-sites', customerId],
    enabled:  !!customerId,
    queryFn:  async () => {
      const res  = await fetch(`/api/shared/customers/${customerId}/sites`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as Site[];
    },
  });
}

function useSharedUsers() {
  return useQuery({
    queryKey: ['shared-users'],
    queryFn: async () => {
      const res  = await fetch('/api/shared/users', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as RepUser[];
    },
  });
}

function useApprovedQuotes(customerId: string) {
  return useQuery({
    queryKey: ['approved-quotes', customerId],
    enabled:  !!customerId,
    queryFn:  async () => {
      const res  = await fetch(`/api/shared/quotes/approved?customerId=${customerId}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as Quote[];
    },
  });
}

function useAvailableEquipment() {
  return useQuery({
    queryKey: ['available-equipment'],
    queryFn: async () => {
      const res  = await fetch('/api/equipment?status=AVAILABLE', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as Equipment[];
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RATE_TYPE_OPTS = [
  { value: 'DAILY',   label: 'Daily' },
  { value: 'WEEKLY',  label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

function CONDITION_COLOR(c: string) {
  const m: Record<string, string> = { EXCELLENT: '#006b5e', GOOD: '#2e7d32', FAIR: '#f57f17', POOR: '#c62828' };
  return m[c] ?? '#676879';
}

function calcSubtotal(rate: number, rateType: string, startDate: string, endDate: string) {
  if (!rate || !startDate || !endDate) return 0;
  const days = Math.max(1, Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ));
  if (rateType === 'DAILY')   return rate * days;
  if (rateType === 'WEEKLY')  return rate * Math.ceil(days / 7);
  if (rateType === 'MONTHLY') return rate * Math.ceil(days / 30);
  return 0;
}

function StepIndicator({ step }: { step: number }) {
  const steps = ['Customer & Site', 'Equipment', 'Dates & Terms'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, idx) => {
        const n       = idx + 1;
        const active  = n === step;
        const done    = n < step;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                backgroundColor: done ? '#00897b' : active ? '#e0f2f1' : '#f5f6f8',
                color:           done ? '#fff'     : active ? '#00897b' : '#b4b7c3',
              }}
            >
              {done ? <Check size={13} /> : n}
            </div>
            <span
              className="text-sm font-medium hidden sm:block"
              style={{ color: active ? '#323338' : '#b4b7c3' }}
            >
              {label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className="w-8 h-px flex-shrink-0"
                style={{ backgroundColor: done ? '#00897b' : '#e6e9ef' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);

  // Step 1 state
  const [customerId, setCustomerId]             = useState('');
  const [siteId, setSiteId]                     = useState('');
  const [assignedRepId, setAssignedRepId]       = useState('');
  const [convertedFromQuoteId, setQuoteId]      = useState('');
  const [quoteItems, setQuoteItems]             = useState<Quote['lineItems']>([]);

  // Step 2 state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Step 3 state
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [depositAmount, setDeposit] = useState('');
  const [notes, setNotes]           = useState('');

  const { data: customers = [] }  = useCustomers();
  const { data: sites = [] }      = useCustomerSites(customerId);
  const { data: users = [] }      = useSharedUsers();
  const { data: quotes = [] }     = useApprovedQuotes(customerId);
  const { data: equipment = [], isLoading: eqLoading } = useAvailableEquipment();

  // Reset site when customer changes
  useEffect(() => { setSiteId(''); setQuoteId(''); setQuoteItems([]); }, [customerId]);

  const selectedEquipmentIds = new Set(selectedItems.map((i) => i.equipmentId));

  const totalDays = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const contractTotal = selectedItems.reduce((sum, item) => {
    return sum + calcSubtotal(parseFloat(item.agreedRate) || 0, item.agreedRateType, startDate, endDate);
  }, 0);

  function handleQuoteSelect(quoteId: string) {
    setQuoteId(quoteId);
    const q = quotes.find((q) => q.id === quoteId);
    setQuoteItems(q?.lineItems ?? []);
  }

  function addEquipment(eq: Equipment) {
    if (selectedEquipmentIds.has(eq.id)) return;
    // Check if product matches a quote item to pre-fill rate
    const quoteItem = quoteItems.find((qi) => qi.productId === eq.productId);
    setSelectedItems((prev) => [...prev, {
      equipmentId:  eq.id,
      serialNumber: eq.serialNumber,
      assetTag:     eq.assetTag,
      productName:  eq.productName,
      brandName:    eq.brandName,
      agreedRate:   quoteItem ? String(quoteItem.unitPrice) : String(eq.rentalDailyRate || ''),
      agreedRateType: 'DAILY',
    }]);
  }

  function removeItem(equipmentId: string) {
    setSelectedItems((prev) => prev.filter((i) => i.equipmentId !== equipmentId));
  }

  function updateItem(equipmentId: string, field: keyof SelectedItem, value: string) {
    setSelectedItems((prev) =>
      prev.map((i) => i.equipmentId === equipmentId ? { ...i, [field]: value } : i),
    );
  }

  // Step validation
  function canProceedStep1() {
    return !!customerId && !!assignedRepId;
  }
  function canProceedStep2() {
    return selectedItems.length > 0 && selectedItems.every((i) => parseFloat(i.agreedRate) > 0);
  }
  function canSubmit() {
    return !!startDate && !!endDate && new Date(endDate) > new Date(startDate);
  }

  async function handleSubmit() {
    if (!canSubmit()) return;
    setIsPending(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          siteId: siteId || undefined,
          assignedRepId,
          convertedFromQuoteId: convertedFromQuoteId || undefined,
          items: selectedItems.map((i) => ({
            equipmentId:   i.equipmentId,
            agreedRate:    parseFloat(i.agreedRate),
            agreedRateType: i.agreedRateType,
          })),
          startDate,
          endDate,
          depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create contract');
      qc.invalidateQueries({ queryKey: ['rental-contracts'] });
      toast.success(`Contract ${json.data.contractNumber} created`);
      router.push(`/contracts/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred');
    } finally {
      setIsPending(false);
    }
  }

  if (user && !['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER', 'REP', 'SALES_REP'].includes(user.role)) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#676879' }}>
        You don't have permission to create contracts.
      </div>
    );
  }

  const inputCls = "w-full border rounded px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { borderColor: '#e6e9ef', height: 38 };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={15} />
        Back to Contracts
      </button>

      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e0f2f1' }}>
          <FileText size={20} style={{ color: '#00897b' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#323338' }}>New Contract</h1>
          <p className="text-sm" style={{ color: '#676879' }}>Create a new rental agreement</p>
        </div>
      </div>

      <StepIndicator step={step} />

      {/* ── Step 1: Customer & Site ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>Customer</h2>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            {customerId && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Job Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">— No specific site —</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
                {siteId && (
                  <p className="text-xs mt-1" style={{ color: '#b4b7c3' }}>
                    {sites.find((s) => s.id === siteId)?.siteAddress}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>Assignment</h2>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                Assigned Rep <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">— Select rep —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {customerId && quotes.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                  Convert from Approved Quote
                  <span className="ml-1 text-xs font-normal" style={{ color: '#b4b7c3' }}>(optional)</span>
                </label>
                <select
                  value={convertedFromQuoteId}
                  onChange={(e) => handleQuoteSelect(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">— No quote —</option>
                  {quotes.map((q) => (
                    <option key={q.id} value={q.id}>{q.quoteNumber}</option>
                  ))}
                </select>
                {quoteItems.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: '#f5f6f8' }}>
                    <p className="font-semibold" style={{ color: '#676879' }}>Quote items (use as reference in Step 2):</p>
                    {quoteItems.map((qi, i) => (
                      <p key={i} style={{ color: '#323338' }}>
                        • {qi.productName} × {qi.quantity} — ฿{qi.unitPrice.toLocaleString()}/unit
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1()}
              className="px-6 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#00897b' }}
            >
              Continue to Equipment
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Equipment Selection ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Selected items */}
          {selectedItems.length > 0 && (
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>
                Selected Equipment ({selectedItems.length})
              </h2>
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#f5f6f8' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.productName}</p>
                      <p className="text-xs" style={{ color: '#676879' }}>
                        {item.brandName} · SN: {item.serialNumber}
                        {item.assetTag && ` · ${item.assetTag}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        value={item.agreedRate}
                        onChange={(e) => updateItem(item.equipmentId, 'agreedRate', e.target.value)}
                        placeholder="Rate"
                        className="border rounded px-2 py-1 text-sm outline-none w-28"
                        style={{ borderColor: '#e6e9ef', height: 34 }}
                      />
                      <select
                        value={item.agreedRateType}
                        onChange={(e) => updateItem(item.equipmentId, 'agreedRateType', e.target.value)}
                        className="border rounded px-2 py-1 text-sm outline-none"
                        style={{ borderColor: '#e6e9ef', height: 34 }}
                      >
                        {RATE_TYPE_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeItem(item.equipmentId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available equipment */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#676879' }}>
              Available Equipment
            </h2>
            {eqLoading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <div key={i} className="skeleton h-12 rounded" />)}
              </div>
            ) : equipment.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#b4b7c3' }}>
                No available equipment
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product / Brand</th>
                      <th>Serial / Tag</th>
                      <th>Condition</th>
                      <th>Daily Rate</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((eq) => {
                      const added = selectedEquipmentIds.has(eq.id);
                      return (
                        <tr key={eq.id} style={{ opacity: added ? 0.4 : 1 }}>
                          <td>
                            <p className="text-sm font-semibold leading-snug">{eq.productName}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{eq.brandName}</p>
                          </td>
                          <td>
                            <p className="font-mono text-sm">{eq.serialNumber}</p>
                            {eq.assetTag && (
                              <p className="text-xs" style={{ color: '#676879' }}>{eq.assetTag}</p>
                            )}
                          </td>
                          <td>
                            <span className="text-xs font-medium" style={{ color: CONDITION_COLOR(eq.condition) }}>
                              {eq.condition.charAt(0) + eq.condition.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm">
                              {eq.rentalDailyRate > 0 ? `฿${eq.rentalDailyRate.toLocaleString()}` : '—'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => addEquipment(eq)}
                              disabled={added}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-teal-50 hover:border-teal-200 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ borderColor: '#e6e9ef', color: '#00897b' }}
                            >
                              <Plus size={12} />
                              {added ? 'Added' : 'Add'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50"
              style={{ borderColor: '#e6e9ef', color: '#323338' }}
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2()}
              className="px-6 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#00897b' }}
            >
              Continue to Dates
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Dates & Terms ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>Rental Period</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            {totalDays > 0 && (
              <p className="text-sm" style={{ color: '#00897b' }}>
                Duration: <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong>
              </p>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>Financial</h2>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
                Deposit Amount (฿)
                <span className="ml-1 text-xs font-normal" style={{ color: '#b4b7c3' }}>(auto-calculated if empty)</span>
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="Leave blank to use default rate"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Review */}
          <div className="card p-5 space-y-3" style={{ backgroundColor: '#f5f6f8' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#676879' }}>Review</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span style={{ color: '#676879' }}>Customer</span>
              <span className="font-medium">
                {customers.find((c) => c.id === customerId)?.companyName}
              </span>
              {siteId && (
                <>
                  <span style={{ color: '#676879' }}>Site</span>
                  <span className="font-medium">{sites.find((s) => s.id === siteId)?.siteName}</span>
                </>
              )}
              <span style={{ color: '#676879' }}>Equipment</span>
              <span className="font-medium">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}</span>
              <span style={{ color: '#676879' }}>Period</span>
              <span className="font-medium">
                {startDate && endDate ? `${startDate} → ${endDate} (${totalDays}d)` : '—'}
              </span>
              <span style={{ color: '#676879' }}>Total</span>
              <span className="font-bold" style={{ color: '#00897b' }}>
                ฿{contractTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special terms or conditions…"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: '#e6e9ef' }}
            />
          </div>

          <div className="flex items-center justify-between pb-6">
            <button
              onClick={() => setStep(2)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#e6e9ef', color: '#323338' }}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !canSubmit()}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Creating…' : 'Create Contract'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
