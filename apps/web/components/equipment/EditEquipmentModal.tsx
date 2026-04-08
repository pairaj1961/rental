'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateEquipment } from '@/hooks/useEquipment';
import { EquipmentStatus } from '@rental/shared';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  equipment: any;
}

const CATEGORIES = [
  'Excavator', 'Crane', 'Dump Truck', 'Compactor', 'Grader',
  'Pump', 'Drill', 'Scaffolding', 'Other',
];

const STATUS_OPTIONS = [
  { value: EquipmentStatus.AVAILABLE, label: 'Available' },
  { value: EquipmentStatus.MAINTENANCE, label: 'Maintenance' },
  { value: EquipmentStatus.RETIRED, label: 'Retired' },
];

export default function EditEquipmentModal({ open, onClose, equipment }: Props) {
  const { mutate: updateEquipment, isPending } = useUpdateEquipment();

  const [form, setForm] = useState({
    modelName: '',
    serialNumber: '',
    category: '',
    customCategory: '',
    description: '',
    conditionRating: 5,
    notes: '',
    status: EquipmentStatus.AVAILABLE,
  });

  // Populate form when equipment data arrives
  useEffect(() => {
    if (equipment && open) {
      const knownCategory = CATEGORIES.slice(0, -1).includes(equipment.category);
      setForm({
        modelName: equipment.modelName ?? '',
        serialNumber: equipment.serialNumber ?? '',
        category: knownCategory ? equipment.category : 'Other',
        customCategory: knownCategory ? '' : equipment.category ?? '',
        description: equipment.description ?? '',
        conditionRating: equipment.conditionRating ?? 5,
        notes: equipment.notes ?? '',
        status: equipment.status ?? EquipmentStatus.AVAILABLE,
      });
    }
  }, [equipment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = form.category === 'Other' ? form.customCategory : form.category;
    if (!category.trim()) { toast.error('Please specify equipment category'); return; }

    updateEquipment(
      {
        id: equipment.id,
        modelName: form.modelName.trim(),
        serialNumber: form.serialNumber.trim(),
        category: category.trim(),
        description: form.description.trim() || undefined,
        conditionRating: form.conditionRating,
        notes: form.notes.trim() || undefined,
        status: form.status,
      },
      {
        onSuccess: () => { toast.success('Saved successfully'); onClose(); },
        onError: (err: any) => toast.error(err?.message ?? 'An error occurred'),
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-lg font-bold">Edit Equipment</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Model Name <span className="text-red-500">*</span></label>
              <input required value={form.modelName}
                onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }} />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Serial Number <span className="text-red-500">*</span></label>
              <input required value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono"
                style={{ borderColor: '#e6e9ef' }} />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
              <select required value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}>
                <option value="">-- Select category --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.category === 'Other' && (
                <input required value={form.customCategory}
                  onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                  placeholder="Enter category..."
                  className="mt-2 w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }} />
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EquipmentStatus }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-xs mt-1" style={{ color: '#676879' }}>Note: "Rented" status is managed automatically by the rental workflow</p>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium mb-2">Condition</label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button"
                    onClick={() => setForm((f) => ({ ...f, conditionRating: star }))}
                    className="text-2xl transition-transform hover:scale-110">
                    {star <= form.conditionRating ? '★' : '☆'}
                  </button>
                ))}
                <span className="ml-2 text-sm" style={{ color: '#676879' }}>
                  {['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'][form.conditionRating]}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Additional details..."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                style={{ borderColor: '#e6e9ef' }} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes..."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }} />
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button type="button" onClick={onClose} disabled={isPending}
              className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}>Cancel</button>
            <button type="submit" disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
