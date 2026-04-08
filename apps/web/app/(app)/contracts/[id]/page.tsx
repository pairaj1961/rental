'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2, Truck, Receipt, CheckCircle, XCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ContractItem = {
  id: string; equipmentId: string;
  productName: string; brandName: string; serialNumber: string; assetTag: string | null;
  agreedRate: number; agreedRateType: string; subtotal: number;
  condition: string; equipmentStatus: string;
};

type Delivery = {
  id: string; type: string; scheduledDate: string | null; actualDate: string | null;
  address: string | null; province: string | null;
  driverName: string | null; driverPhone: string | null; vehiclePlate: string | null;
  status: string; notes: string | null;
};

type Invoice = {
  id: string; invoiceNumber: string; invoiceDate: string | null; dueDate: string | null;
  subtotal: number; taxRate: number; taxAmount: number; discount: number; total: number;
  status: string; paidAt: string | null; paidAmount: number | null;
};

type Contract = {
  id: string; contractNumber: string; status: string; paymentStatus: string;
  startDate: string | null; endDate: string | null; actualReturnDate: string | null;
  depositAmount: number; totalAmount: number; notes: string | null;
  createdAt: string; updatedAt: string;
  customerName: string; customerAddress: string | null;
  siteName: string | null; siteAddress: string | null;
  assignedRepName: string | null; approvedByName: string | null;
  convertedFromQuoteId: string | null;
  items: ContractItem[];
  deliveries: Delivery[];
  invoices: Invoice[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#f5f6f8', color: '#676879' },
  ACTIVE:    { bg: '#e0f8ef', color: '#00875a' },
  EXTENDED:  { bg: '#e3f2fd', color: '#1565c0' },
  COMPLETED: { bg: '#e8f5e9', color: '#2e7d32' },
  CANCELLED: { bg: '#fce4ec', color: '#c62828' },
};

const INVOICE_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#f5f6f8', color: '#676879' },
  SENT:      { bg: '#e3f2fd', color: '#1565c0' },
  PAID:      { bg: '#e0f8ef', color: '#00875a' },
  OVERDUE:   { bg: '#fce4ec', color: '#c62828' },
  CANCELLED: { bg: '#f5f5f5', color: '#757575' },
};

const DELIVERY_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SCHEDULED:  { bg: '#fff8e1', color: '#e65100' },
  COMPLETED:  { bg: '#e0f8ef', color: '#00875a' },
  CANCELLED:  { bg: '#fce4ec', color: '#c62828' },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const res  = await fetch(`/api/contracts/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json.data as Contract;
    },
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h3 className="text-base font-semibold" style={{ color: '#323338' }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ScheduleDeliveryModal({
  contractId, onClose, onSuccess,
}: { contractId: string; onClose: () => void; onSuccess: () => void }) {
  const [type, setType]           = useState('DELIVERY');
  const [scheduledDate, setDate]  = useState('');
  const [address, setAddress]     = useState('');
  const [driverName, setDriver]   = useState('');
  const [driverPhone, setPhone]   = useState('');
  const [vehiclePlate, setPlate]  = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);

  const inputCls = "w-full border rounded px-3 py-2 text-sm outline-none";
  const inputStyle = { borderColor: '#e6e9ef', height: 36 };

  async function handleSubmit() {
    if (!scheduledDate) { toast.error('Scheduled date is required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, scheduledDate, address, driverName, driverPhone, vehiclePlate, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Delivery scheduled');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Schedule Delivery / Pickup" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Scheduled Date *</label>
          <input type="date" value={scheduledDate} onChange={(e) => setDate(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className={inputCls} style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Driver</label>
            <input value={driverName} onChange={(e) => setDriver(e.target.value)} placeholder="Driver name" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Vehicle Plate</label>
            <input value={vehiclePlate} onChange={(e) => setPlate(e.target.value)} placeholder="e.g. กข-1234" className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#e6e9ef' }} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50" style={{ borderColor: '#e6e9ef' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#00897b' }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Schedule
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateInvoiceModal({
  contractId, onClose, onSuccess,
}: { contractId: string; onClose: () => void; onSuccess: () => void }) {
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);

  const inputCls = "w-full border rounded px-3 py-2 text-sm outline-none";

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ discount: parseFloat(discount) || 0, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success(`Invoice ${json.data.invoiceNumber} created`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Create Invoice" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Discount (฿)</label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={inputCls}
            style={{ borderColor: '#e6e9ef', height: 36 }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#e6e9ef' }} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50" style={{ borderColor: '#e6e9ef' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#00897b' }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Create Invoice
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CompleteContractModal({
  contractId, onClose, onSuccess,
}: { contractId: string; onClose: () => void; onSuccess: () => void }) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading]       = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETED', actualReturnDate: returnDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Contract completed');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Complete Contract" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: '#676879' }}>
          This will mark the contract as completed and release all equipment back to Available status.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>Actual Return Date</label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e6e9ef', height: 36 }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50" style={{ borderColor: '#e6e9ef' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#00897b' }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Complete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const { user } = useAuth();
  const qc      = useQueryClient();

  const { data: contract, isLoading, error } = useContract(id);

  const [tab, setTab]                     = useState<'summary' | 'equipment' | 'deliveries' | 'invoices'>('summary');
  const [showDeliveryModal, setDelivery]   = useState(false);
  const [showInvoiceModal, setInvoice]     = useState(false);
  const [showCompleteModal, setComplete]   = useState(false);
  const [actionLoading, setActionLoading]  = useState(false);

  const isManager = ['ADMIN', 'MANAGER', 'SYSTEM_ADMIN', 'SALES_MANAGER'].includes(user?.role ?? '');

  async function transitionStatus(newStatus: string) {
    setActionLoading(true);
    try {
      const res  = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success(`Contract ${newStatus.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['contract', id] });
      qc.invalidateQueries({ queryKey: ['rental-contracts'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function onModalSuccess() {
    qc.invalidateQueries({ queryKey: ['contract', id] });
    qc.invalidateQueries({ queryKey: ['rental-contracts'] });
    setDelivery(false);
    setInvoice(false);
    setComplete(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#676879' }}>
        Contract not found.
      </div>
    );
  }

  const s     = contract.status;
  const csS   = CONTRACT_STATUS_STYLE[s] ?? CONTRACT_STATUS_STYLE.DRAFT;

  const TABS = [
    { key: 'summary',   label: 'Summary',   count: null },
    { key: 'equipment', label: 'Equipment', count: contract.items.length },
    { key: 'deliveries',label: 'Deliveries',count: contract.deliveries.length },
    { key: 'invoices',  label: 'Invoices',  count: contract.invoices.length },
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showDeliveryModal && (
        <ScheduleDeliveryModal contractId={id} onClose={() => setDelivery(false)} onSuccess={onModalSuccess} />
      )}
      {showInvoiceModal && (
        <CreateInvoiceModal contractId={id} onClose={() => setInvoice(false)} onSuccess={onModalSuccess} />
      )}
      {showCompleteModal && (
        <CompleteContractModal contractId={id} onClose={() => setComplete(false)} onSuccess={onModalSuccess} />
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/contracts')}
        className="flex items-center gap-2 text-sm mb-6 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={15} />
        Back to Contracts
      </button>

      {/* Header card */}
      <div className="card p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#e0f2f1' }}
          >
            <FileText size={20} style={{ color: '#00897b' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" style={{ color: '#323338' }}>
                {contract.contractNumber}
              </h1>
              <Badge label={s.charAt(0) + s.slice(1).toLowerCase()} style={csS} />
              <Badge
                label={contract.paymentStatus.charAt(0) + contract.paymentStatus.slice(1).toLowerCase()}
                style={{ bg: '#f5f6f8', color: '#676879' }}
              />
            </div>
            <p className="text-sm" style={{ color: '#676879' }}>
              {contract.customerName}
              {contract.siteName && ` · ${contract.siteName}`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {s === 'DRAFT' && isManager && (
              <button
                onClick={() => transitionStatus('ACTIVE')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#00897b' }}
              >
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                Activate
              </button>
            )}
            {['ACTIVE', 'EXTENDED'].includes(s) && (
              <>
                <button
                  onClick={() => setInvoice(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                  style={{ borderColor: '#e6e9ef', color: '#323338' }}
                >
                  <Receipt size={14} />
                  Invoice
                </button>
                <button
                  onClick={() => setDelivery(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                  style={{ borderColor: '#e6e9ef', color: '#323338' }}
                >
                  <Truck size={14} />
                  Schedule
                </button>
                {isManager && (
                  <button
                    onClick={() => setComplete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                    style={{ borderColor: '#e6e9ef', color: '#323338' }}
                  >
                    <CheckCircle size={14} />
                    Complete
                  </button>
                )}
              </>
            )}
            {['DRAFT', 'ACTIVE', 'EXTENDED'].includes(s) && isManager && (
              <button
                onClick={() => { if (confirm('Cancel this contract?')) transitionStatus('CANCELLED'); }}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-red-50 hover:border-red-200 disabled:opacity-50"
                style={{ borderColor: '#e6e9ef', color: '#c62828' }}
              >
                <XCircle size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#e6e9ef' }}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5"
            style={{
              color: tab === key ? '#00897b' : '#676879',
              borderBottom: tab === key ? '2px solid #00897b' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
            {count != null && count > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: tab === key ? '#e0f2f1' : '#f5f6f8',
                  color: tab === key ? '#00897b' : '#676879',
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Summary tab ── */}
      {tab === 'summary' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#676879' }}>Contract Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              {[
                { label: 'Customer',      value: contract.customerName },
                { label: 'Site',          value: contract.siteName ?? '—' },
                { label: 'Assigned Rep',  value: contract.assignedRepName ?? '—' },
                { label: 'Approved By',   value: contract.approvedByName ?? '—' },
                { label: 'Start Date',    value: contract.startDate ? formatDate(contract.startDate) : '—' },
                { label: 'End Date',      value: contract.endDate ? formatDate(contract.endDate) : '—' },
                { label: 'Return Date',   value: contract.actualReturnDate ? formatDate(contract.actualReturnDate) : '—' },
                { label: 'Total Amount',  value: `฿${contract.totalAmount.toLocaleString()}` },
                { label: 'Deposit',       value: `฿${contract.depositAmount.toLocaleString()}` },
                { label: 'Created',       value: contract.createdAt ? formatDate(contract.createdAt) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium uppercase mb-0.5" style={{ color: '#b4b7c3' }}>{label}</p>
                  <p className="text-sm font-medium" style={{ color: '#323338' }}>{value}</p>
                </div>
              ))}
            </div>
            {contract.notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e6e9ef' }}>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: '#b4b7c3' }}>Notes</p>
                <p className="text-sm" style={{ color: '#676879' }}>{contract.notes}</p>
              </div>
            )}
          </div>

          {contract.siteAddress && (
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#b4b7c3' }}>Site Address</p>
              <p className="text-sm" style={{ color: '#323338' }}>{contract.siteAddress}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Equipment tab ── */}
      {tab === 'equipment' && (
        <div className="card overflow-hidden">
          {contract.items.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#676879' }}>
              <p className="text-sm">No equipment on this contract</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product / Brand</th>
                    <th>Serial / Tag</th>
                    <th>Condition</th>
                    <th>Agreed Rate</th>
                    <th className="text-right">Subtotal (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="text-sm font-semibold">{item.productName}</p>
                        <p className="text-xs" style={{ color: '#676879' }}>{item.brandName}</p>
                      </td>
                      <td>
                        <p className="font-mono text-sm">{item.serialNumber}</p>
                        {item.assetTag && <p className="text-xs" style={{ color: '#676879' }}>{item.assetTag}</p>}
                      </td>
                      <td>
                        <span className="text-xs font-medium">{item.condition.charAt(0) + item.condition.slice(1).toLowerCase()}</span>
                      </td>
                      <td>
                        <p className="text-sm">฿{item.agreedRate.toLocaleString()} / {item.agreedRateType.toLowerCase()}</p>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-semibold">฿{item.subtotal.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="text-right font-semibold text-sm pt-3" style={{ color: '#676879' }}>
                      Contract Total
                    </td>
                    <td className="text-right">
                      <span className="text-base font-bold" style={{ color: '#00897b' }}>
                        ฿{contract.totalAmount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Deliveries tab ── */}
      {tab === 'deliveries' && (
        <div className="space-y-4">
          {['ACTIVE', 'EXTENDED'].includes(s) && (
            <div className="flex justify-end">
              <button
                onClick={() => setDelivery(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: '#00897b' }}
              >
                <Truck size={14} />
                Schedule Delivery / Pickup
              </button>
            </div>
          )}
          <div className="card overflow-hidden">
            {contract.deliveries.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#676879' }}>
                <Truck size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No deliveries scheduled</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#e6e9ef' }}>
                {contract.deliveries.map((d) => {
                  const ds = DELIVERY_STATUS_STYLE[d.status] ?? DELIVERY_STATUS_STYLE.SCHEDULED;
                  return (
                    <div key={d.id} className="p-4 flex items-start gap-4">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#e0f2f1' }}
                      >
                        <Truck size={14} style={{ color: '#00897b' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: '#323338' }}>
                            {d.type.charAt(0) + d.type.slice(1).toLowerCase()}
                          </span>
                          <Badge label={d.status.charAt(0) + d.status.slice(1).toLowerCase()} style={ds} />
                        </div>
                        <p className="text-sm" style={{ color: '#676879' }}>
                          Scheduled: {d.scheduledDate ? formatDate(d.scheduledDate) : '—'}
                          {d.actualDate && ` · Completed: ${formatDate(d.actualDate)}`}
                        </p>
                        {d.address && <p className="text-xs mt-0.5" style={{ color: '#b4b7c3' }}>{d.address}</p>}
                        {d.driverName && (
                          <p className="text-xs mt-0.5" style={{ color: '#b4b7c3' }}>
                            Driver: {d.driverName}{d.vehiclePlate && ` · ${d.vehiclePlate}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invoices tab ── */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          {['ACTIVE', 'EXTENDED'].includes(s) && isManager && (
            <div className="flex justify-end">
              <button
                onClick={() => setInvoice(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: '#00897b' }}
              >
                <Receipt size={14} />
                Create Invoice
              </button>
            </div>
          )}
          <div className="card overflow-hidden">
            {contract.invoices.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#676879' }}>
                <Receipt size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Due</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th className="text-right">Total (฿)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.invoices.map((inv) => {
                      const is = INVOICE_STATUS_STYLE[inv.status] ?? INVOICE_STATUS_STYLE.DRAFT;
                      return (
                        <tr key={inv.id}>
                          <td><span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span></td>
                          <td><span className="text-sm">{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</span></td>
                          <td><span className="text-sm">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</span></td>
                          <td><span className="text-sm">฿{inv.subtotal.toLocaleString()}</span></td>
                          <td><span className="text-sm">{inv.taxRate}% = ฿{inv.taxAmount.toLocaleString()}</span></td>
                          <td className="text-right">
                            <span className="text-sm font-bold">฿{inv.total.toLocaleString()}</span>
                          </td>
                          <td><Badge label={inv.status.charAt(0) + inv.status.slice(1).toLowerCase()} style={is} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
