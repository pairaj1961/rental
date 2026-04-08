'use client';

import { useState } from 'react';
import { X, Loader2, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEquipmentList } from '@/hooks/useEquipment';
import { useSwapEquipment } from '@/hooks/useRentals';
import { EquipmentStatus } from '@rental/shared';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  rentalId: string;
  currentEquipmentId: string;
  currentEquipmentName: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SwapEquipmentModal({
  open, onClose, rentalId, currentEquipmentId, currentEquipmentName,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');

  const { data: equipmentData, isLoading } = useEquipmentList({
    status: EquipmentStatus.AVAILABLE,
    ...(search && { search }),
  });
  const equipment = (equipmentData ?? []).filter((e: any) => e.id !== currentEquipmentId);

  const swap = useSwapEquipment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { toast.error('Please select a replacement machine'); return; }
    if (!reason.trim()) { toast.error('Please enter a reason'); return; }

    swap.mutate(
      { id: rentalId, replacementEquipmentId: selectedId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Equipment swapped successfully');
          setSelectedId(''); setReason(''); setSearch('');
          onClose();
        },
        onError: (err: any) => toast.error(err?.message ?? 'An error occurred'),
      },
    );
  };

  if (!open) return null;

  const selected = equipment.find((e: any) => e.id === selectedId);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <div>
            <h2 className="text-lg font-bold">Swap Equipment</h2>
            <p className="text-xs mt-0.5" style={{ color: '#676879' }}>Current: {currentEquipmentName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Warning */}
            <div className="flex gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fff8e1', border: '1px solid #ffe082' }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <span style={{ color: '#92400e' }}>
                The current machine (<strong>{currentEquipmentName}</strong>) will be set to <strong>Maintenance</strong> and a maintenance log will be created automatically.
              </span>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for Swap <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Hydraulic pump leak, engine failure..."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Equipment picker */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Replacement Equipment <span className="text-red-500">*</span>
              </label>

              {/* Search */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search model, serial number..."
                  className="w-full pl-8 pr-3 border rounded text-sm outline-none focus:border-teal-500"
                  style={{ height: 32, borderColor: '#e6e9ef' }}
                />
              </div>

              {/* List */}
              <div className="rounded-lg border overflow-y-auto" style={{ maxHeight: 240, borderColor: '#e6e9ef' }}>
                {isLoading ? (
                  <div className="p-4 text-center text-sm" style={{ color: '#676879' }}>Loading...</div>
                ) : equipment.length === 0 ? (
                  <div className="p-4 text-center text-sm" style={{ color: '#676879' }}>No available equipment</div>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#e6e9ef' }}>
                    {equipment.map((eq: any) => (
                      <div
                        key={eq.id}
                        onClick={() => setSelectedId(eq.id)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ backgroundColor: selectedId === eq.id ? '#e0f2f1' : undefined }}
                      >
                        {eq.coverPhoto?.urls?.thumb ? (
                          <img src={`${API_BASE}${eq.coverPhoto.urls.thumb}`} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: '#f5f6f8' }}>🔧</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{eq.modelName}</p>
                          <p className="text-xs font-mono truncate" style={{ color: '#676879' }}>{eq.serialNumber}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>{eq.category}</span>
                        {selectedId === eq.id && <CheckCircle2 size={16} style={{ color: '#00897b', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected summary */}
            {selected && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
                <CheckCircle2 size={14} />
                Replacement: {selected.modelName} ({selected.serialNumber})
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button
              type="button" onClick={onClose} disabled={swap.isPending}
              className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}
            >Cancel</button>
            <button
              type="submit" disabled={swap.isPending || !selectedId}
              className="px-5 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}
            >
              {swap.isPending && <Loader2 size={14} className="animate-spin" />}
              {swap.isPending ? 'Processing...' : '🔄 Confirm Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
