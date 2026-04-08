'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { MaintenanceType } from '@rental/shared';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  rentalId: string;
  log?: any; // populated when editing
  onCreate: (data: any) => Promise<any>;
  onUpdate: (data: any) => Promise<any>;
}

const TYPE_OPTIONS = [
  { value: MaintenanceType.REPAIR, label: 'Repair' },
  { value: MaintenanceType.PM, label: 'Preventive Maintenance (PM)' },
  { value: MaintenanceType.EMERGENCY, label: 'Emergency' },
];

const today = () => new Date().toISOString().split('T')[0];

export default function MaintenanceLogModal({ open, onClose, equipmentId, log, onCreate, onUpdate }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState({
    type: MaintenanceType.REPAIR,
    visitDate: today(),
    description: '',
    downtimeHours: '',
  });
  const [parts, setParts] = useState<{ name: string; quantity: string; cost: string }[]>([]);

  const isEdit = !!log;

  useEffect(() => {
    if (open) {
      if (log) {
        setForm({
          type: log.type ?? MaintenanceType.REPAIR,
          visitDate: log.visitDate ? log.visitDate.split('T')[0] : today(),
          description: log.description ?? '',
          downtimeHours: log.downtimeHours != null ? String(log.downtimeHours) : '',
        });
        setParts(
          (log.partsUsed ?? []).map((p: any) => ({
            name: p.name ?? '',
            quantity: String(p.quantity ?? ''),
            cost: p.cost != null ? String(p.cost) : '',
          }))
        );
      } else {
        setForm({ type: MaintenanceType.REPAIR, visitDate: today(), description: '', downtimeHours: '' });
        setParts([]);
      }
    }
  }, [open, log]);

  const addPart = () => setParts((p) => [...p, { name: '', quantity: '1', cost: '' }]);
  const removePart = (i: number) => setParts((p) => p.filter((_, idx) => idx !== i));
  const setPart = (i: number, field: string, value: string) =>
    setParts((p) => p.map((part, idx) => (idx === i ? { ...part, [field]: value } : part)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Please enter a description'); return; }

    const payload = {
      equipmentId,
      type: form.type,
      visitDate: new Date(form.visitDate).toISOString(),
      description: form.description.trim(),
      downtimeHours: form.downtimeHours !== '' ? parseFloat(form.downtimeHours) : undefined,
      partsUsed: parts
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          quantity: parseInt(p.quantity) || 1,
          ...(p.cost !== '' ? { cost: parseFloat(p.cost) } : {}),
        })),
    };

    setIsPending(true);
    try {
      if (isEdit) {
        await onUpdate({ logId: log.id, ...payload });
        toast.success('Log updated');
      } else {
        await onCreate(payload);
        toast.success('Maintenance log added');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'An error occurred');
    } finally {
      setIsPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Maintenance Log' : 'Add Maintenance Log'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type <span className="text-red-500">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MaintenanceType }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Visit Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Visit Date <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description <span className="text-red-500">*</span></label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the work performed..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Downtime */}
            <div>
              <label className="block text-sm font-medium mb-1">Downtime Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.downtimeHours}
                onChange={(e) => setForm((f) => ({ ...f, downtimeHours: e.target.value }))}
                placeholder="0"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Parts used */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Parts Used</label>
                <button
                  type="button"
                  onClick={addPart}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border hover:bg-gray-50"
                  style={{ borderColor: '#e6e9ef', color: '#0073ea' }}
                >
                  <Plus size={12} /> Add Part
                </button>
              </div>
              {parts.length === 0 ? (
                <p className="text-xs" style={{ color: '#c4c4c4' }}>No parts added</p>
              ) : (
                <div className="space-y-2">
                  {parts.map((part, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={part.name}
                        onChange={(e) => setPart(i, 'name', e.target.value)}
                        placeholder="Part name"
                        className="flex-1 border rounded px-2 py-1.5 text-sm outline-none focus:border-teal-500"
                        style={{ borderColor: '#e6e9ef' }}
                      />
                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => setPart(i, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-16 border rounded px-2 py-1.5 text-sm outline-none focus:border-teal-500 text-center"
                        style={{ borderColor: '#e6e9ef' }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={part.cost}
                        onChange={(e) => setPart(i, 'cost', e.target.value)}
                        placeholder="Cost"
                        className="w-24 border rounded px-2 py-1.5 text-sm outline-none focus:border-teal-500"
                        style={{ borderColor: '#e6e9ef' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePart(i)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs" style={{ color: '#676879' }}>Part name · Qty · Cost (optional)</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
