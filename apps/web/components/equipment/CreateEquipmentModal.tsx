'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateEquipment } from '@/hooks/useEquipment';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Excavator', 'Crane', 'Dump Truck', 'Compactor', 'Grader',
  'Pump', 'Drill', 'Scaffolding', 'Other',
];

export default function CreateEquipmentModal({ open, onClose }: Props) {
  const { mutate: createEquipment, isPending } = useCreateEquipment();
  const [form, setForm] = useState({
    modelName: '',
    serialNumber: '',
    category: '',
    customCategory: '',
    description: '',
    conditionRating: 5,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = form.category === 'Other' ? form.customCategory : form.category;
    if (!category.trim()) {
      toast.error('Please specify equipment category');
      return;
    }
    createEquipment(
      {
        modelName: form.modelName.trim(),
        serialNumber: form.serialNumber.trim(),
        category: category.trim(),
        description: form.description.trim() || undefined,
        conditionRating: form.conditionRating,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Equipment added successfully');
          setForm({ modelName: '', serialNumber: '', category: '', customCategory: '', description: '', conditionRating: 5, notes: '' });
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.message ?? 'An error occurred');
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-lg font-bold">Add New Equipment</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Model Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.modelName}
                onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))}
                placeholder="เช่น Komatsu PC200-8"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="เช่น SN-2024-001"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              >
                <option value="">-- Select category --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {form.category === 'Other' && (
                <input
                  required
                  value={form.customCategory}
                  onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                  placeholder="Enter category..."
                  className="mt-2 w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }}
                />
              )}
            </div>

            {/* Condition Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Condition</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, conditionRating: star }))}
                    className="text-2xl transition-transform hover:scale-110"
                  >
                    {star <= form.conditionRating ? '★' : '☆'}
                  </button>
                ))}
                <span className="ml-2 text-sm self-center" style={{ color: '#676879' }}>
                  {form.conditionRating === 5 ? 'Excellent' :
                   form.conditionRating === 4 ? 'Good' :
                   form.conditionRating === 3 ? 'Fair' :
                   form.conditionRating === 2 ? 'Poor' : 'Very Poor'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes..."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 transition-opacity disabled:opacity-60"
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
