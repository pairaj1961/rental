'use client';

import { useState } from 'react';
import { useRentals, useTransitionRental, useSwapEquipment } from '@/hooks/useRentals';
import { RentalStatusBadge } from '@/components/shared/StatusBadge';
import { RentalStatus, STATUS_TRANSITIONS, RENTAL_STATUS_LABELS } from '@rental/shared';
import { formatDate } from '@/lib/utils';
import {
  Plus, Search, AlertCircle, Loader2, RefreshCw, ChevronRight,
  LayoutList, Columns3, X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuth, type UserRole } from '@/providers/AuthProvider';
import SwapEquipmentModal from '@/components/rentals/SwapEquipmentModal';

/* ─────────────────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  ORDER_RECEIVED: 'Order Received', PREPARING: 'Preparing',
  DELIVERED: 'Delivered', ACTIVE: 'Active',
  RETURNING: 'Returning', CLOSED: 'Closed', CANCELLED: 'Cancelled',
};

const TRANSITION_LABELS: Record<string, string> = {
  PREPARING:  '→ Preparing',
  DELIVERED:  '→ Deliver',
  ACTIVE:     '→ Activate',
  RETURNING:  '→ Returning',
  CLOSED:     '→ Close',
  CANCELLED:  '✕ Cancel',
};

const SWAPPABLE = [RentalStatus.DELIVERED, RentalStatus.ACTIVE, RentalStatus.RETURNING];

/* ── Board card (shared) ─────────────────────────────────────────── */
function RentalBoardCard({ rental, onView }: { rental: any; onView: () => void }) {
  return (
    <div
      className="bg-white border rounded-lg p-3.5 cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
      style={{ borderColor: '#e6e9ef' }}
      onClick={onView}
    >
      <div className="flex justify-between items-start mb-2 gap-1">
        <span className="font-mono text-[11px] font-medium" style={{ color: '#b4b7c3' }}>
          {rental.rentalNumber}
        </span>
        <RentalStatusBadge status={rental.status} />
      </div>
      <p className="font-semibold text-sm mb-1 leading-snug">{rental.equipment?.modelName}</p>
      <p className="text-xs truncate" style={{ color: '#676879' }}>{rental.customer?.companyName}</p>
      <p className="text-xs truncate mt-0.5" style={{ color: '#b4b7c3' }}>{rental.jobSite?.siteName}</p>
      <div className="flex justify-between items-center mt-2.5 pt-2 border-t text-xs" style={{ borderColor: '#f0f0f0', color: '#b4b7c3' }}>
        <span>{formatDate(rental.rentalStartDate)}</span>
        <span>→ {formatDate(rental.rentalEndDate)}</span>
      </div>
    </div>
  );
}

/* ── Draggable card ──────────────────────────────────────────────── */
function DraggableCard({ rental, onView }: { rental: any; onView: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rental.id,
    data: { rental },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }}
      {...listeners}
      {...attributes}
    >
      <RentalBoardCard rental={rental} onView={onView} />
    </div>
  );
}

/* ── Droppable column ────────────────────────────────────────────── */
function DroppableColumn({ status, children, count }: { status: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-[260px] rounded-xl transition-all"
      style={{
        backgroundColor: isOver ? '#e0f2f1' : '#f5f6f8',
        outline: isOver ? '2px solid #00897b' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#e6e9ef' }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#676879' }}>
          {RENTAL_STATUS_LABELS[status as RentalStatus]}
        </span>
        <span
          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: count > 0 ? '#00897b' : '#e6e9ef', color: count > 0 ? 'white' : '#676879' }}
        >
          {count}
        </span>
      </div>
      <div className="p-2 space-y-2 min-h-[80px] max-h-[calc(100vh-260px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f5f6f8' }}>
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="font-bold text-base mb-1">No rentals found</h3>
      <p className="text-sm mb-5" style={{ color: '#676879' }}>Create your first rental to get started</p>
      <Link
        href="/rentals/new"
        className="inline-flex items-center gap-2 px-5 py-2 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#00897b' }}
      >
        <Plus size={16} />
        New Rental
      </Link>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function RentalsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<RentalStatus | null>(null);
  const [showSwap, setShowSwap] = useState(false);

  const { data, isLoading } = useRentals({
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
  });

  const rentals: any[] = data ?? [];
  const canCreate = !['SERVICE'].includes(user?.role ?? '');
  const canTransition = ['MANAGER','ADMIN','SYSTEM_ADMIN','SALES_MANAGER'].includes(user?.role ?? '');

  const transition = useTransitionRental();

  const handleTransition = (to: RentalStatus) => setPendingTransition(to);

  const confirmTransition = async () => {
    if (!pendingTransition || !selectedRental) return;
    try {
      await transition.mutateAsync({ id: selectedRental.id, to: pendingTransition });
      toast.success(`Status → ${STATUS_LABELS[pendingTransition]}`);
      setSelectedRental((r: any) => r ? { ...r, status: pendingTransition } : r);
      setPendingTransition(null);
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred');
      setPendingTransition(null);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const rental = rentals.find((r) => r.id === active.id);
    if (!rental) return;
    const toStatus = over.id as RentalStatus;
    if (rental.status === toStatus) return;
    const validNext: RentalStatus[] = STATUS_TRANSITIONS[rental.status as RentalStatus] ?? [];
    if (!validNext.includes(toStatus)) {
      toast.error(`Cannot move from ${STATUS_LABELS[rental.status]} → ${STATUS_LABELS[toStatus]}`);
      return;
    }
    try {
      await transition.mutateAsync({ id: rental.id, to: toStatus });
      toast.success(`Moved to ${STATUS_LABELS[toStatus]}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Transition failed');
    }
  };

  const boardStatuses = [
    RentalStatus.ORDER_RECEIVED, RentalStatus.PREPARING, RentalStatus.DELIVERED,
    RentalStatus.ACTIVE, RentalStatus.RETURNING,
  ];

  const rentalsByStatus = boardStatuses.reduce((acc, status) => {
    acc[status] = rentals.filter((r) => r.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 max-w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Rentals</h1>
          <p className="page-subtitle">{isLoading ? '…' : `${rentals.length} records`}</p>
        </div>
        {canCreate && (
          <Link
            href="/rentals/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00897b' }}
          >
            <Plus size={16} />
            New Rental
          </Link>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search #, customer, equipment…"
            className="pl-8 pr-3 text-sm rounded"
            style={{ height: 36, borderColor: '#e6e9ef', width: 230, border: '1px solid' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm px-2 rounded"
          style={{ height: 36, borderColor: '#e6e9ef', border: '1px solid' }}
        >
          <option value="">All statuses</option>
          {Object.entries(RENTAL_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden ml-auto" style={{ borderColor: '#e6e9ef' }}>
          <button
            onClick={() => setView('table')}
            title="Table view"
            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: view === 'table' ? '#0f3d47' : 'white',
              color: view === 'table' ? 'white' : '#676879',
            }}
          >
            <LayoutList size={14} />
            Table
          </button>
          <button
            onClick={() => setView('board')}
            title="Board view"
            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: view === 'board' ? '#0f3d47' : 'white',
              color: view === 'board' ? 'white' : '#676879',
            }}
          >
            <Columns3 size={14} />
            Board
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-11 rounded-lg" />)}
        </div>
      ) : rentals.length === 0 ? (
        <EmptyState />
      ) : view === 'table' ? (

        /* ── Table ── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Customer</th>
                  <th>Equipment</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rentals.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable group"
                    onClick={() => setSelectedRental(r)}
                  >
                    <td>
                      <span className="font-mono text-xs font-medium" style={{ color: '#676879' }}>
                        {r.rentalNumber}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-medium">{r.customer?.companyName}</p>
                      <p className="text-xs" style={{ color: '#676879' }}>{r.jobSite?.siteName}</p>
                    </td>
                    <td className="text-sm">{r.equipment?.modelName}</td>
                    <td><RentalStatusBadge status={r.status} /></td>
                    <td className="text-xs" style={{ color: '#676879' }}>{formatDate(r.rentalStartDate)}</td>
                    <td className="text-xs" style={{ color: '#676879' }}>{formatDate(r.rentalEndDate)}</td>
                    <td>
                      <ChevronRight
                        size={15}
                        className="opacity-0 group-hover:opacity-40 transition-opacity"
                        style={{ color: '#676879' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ── Board ── */
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {boardStatuses.map((status) => (
              <DroppableColumn key={status} status={status} count={rentalsByStatus[status]?.length ?? 0}>
                {(rentalsByStatus[status] ?? []).map((r) => (
                  canTransition
                    ? <DraggableCard key={r.id} rental={r} onView={() => setSelectedRental(r)} />
                    : <RentalBoardCard key={r.id} rental={r} onView={() => setSelectedRental(r)} />
                ))}
                {(rentalsByStatus[status] ?? []).length === 0 && (
                  <p className="text-center text-xs py-6" style={{ color: '#c4c4c4' }}>Empty</p>
                )}
              </DroppableColumn>
            ))}
          </div>
          <DragOverlay>
            {activeId && (() => {
              const r = rentals.find((r) => r.id === activeId);
              return r ? <div style={{ opacity: 0.85 }}><RentalBoardCard rental={r} onView={() => {}} /></div> : null;
            })()}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Swap modal ── */}
      {selectedRental && (
        <SwapEquipmentModal
          open={showSwap}
          onClose={() => setShowSwap(false)}
          rentalId={selectedRental.id}
          currentEquipmentId={selectedRental.equipmentId ?? selectedRental.equipment?.id}
          currentEquipmentName={`${selectedRental.equipment?.modelName} (${selectedRental.equipment?.serialNumber})`}
        />
      )}

      {/* ── Side panel ── */}
      {selectedRental && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end"
          onClick={() => { if (showSwap) return; setSelectedRental(null); setPendingTransition(null); }}
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        >
          <div
            className="bg-white h-full overflow-y-auto flex flex-col shadow-2xl animate-fade-in"
            style={{ width: 480, maxWidth: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div
              className="flex items-start justify-between p-5 border-b shrink-0"
              style={{ backgroundColor: '#0f3d47', borderColor: '#1a4d58' }}
            >
              <div>
                <p className="font-mono text-sm font-bold text-white">{selectedRental.rentalNumber}</p>
                <div className="mt-1.5">
                  <RentalStatusBadge status={selectedRental.status} />
                </div>
              </div>
              <button
                onClick={() => { setSelectedRental(null); setPendingTransition(null); }}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Transition actions */}
              {canTransition && (() => {
                const nextStatuses: RentalStatus[] = STATUS_TRANSITIONS[selectedRental.status as RentalStatus] ?? [];
                return nextStatuses.length > 0 || SWAPPABLE.includes(selectedRental.status) ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#676879' }}>
                      Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleTransition(s)}
                          disabled={transition.isPending}
                          className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: s === RentalStatus.CANCELLED ? '#e44258' : '#00897b' }}
                        >
                          {TRANSITION_LABELS[s] ?? s}
                        </button>
                      ))}
                      {SWAPPABLE.includes(selectedRental.status) && (
                        <button
                          onClick={() => setShowSwap(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors hover:bg-amber-50"
                          style={{ borderColor: '#f59e0b', color: '#b45309', backgroundColor: '#fffbeb' }}
                        >
                          <RefreshCw size={13} />
                          Swap Equipment
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Transition confirmation */}
              {pendingTransition && (
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm"
                  style={{
                    borderColor: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b',
                    backgroundColor: pendingTransition === RentalStatus.CANCELLED ? '#fff5f6' : '#e0f2f1',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} style={{
                      color: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b',
                      flexShrink: 0,
                    }} />
                    <span className="font-semibold">
                      Confirm → &ldquo;{STATUS_LABELS[pendingTransition]}&rdquo;?
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setPendingTransition(null)}
                      disabled={transition.isPending}
                      className="px-3 py-1 rounded-lg border text-xs font-medium hover:bg-white disabled:opacity-50 transition-colors"
                      style={{ borderColor: '#e6e9ef' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmTransition}
                      disabled={transition.isPending}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 disabled:opacity-60 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: pendingTransition === RentalStatus.CANCELLED ? '#e44258' : '#00897b' }}
                    >
                      {transition.isPending && <Loader2 size={11} className="animate-spin" />}
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="card p-4 grid grid-cols-2 gap-4">
                {[
                  ['Customer', selectedRental.customer?.companyName, selectedRental.customer?.contactPerson],
                  ['Job Site', selectedRental.jobSite?.siteName, selectedRental.jobSite?.siteAddress],
                  ['Equipment', selectedRental.equipment?.modelName, selectedRental.equipment?.serialNumber],
                  ['Period', formatDate(selectedRental.rentalStartDate), `→ ${formatDate(selectedRental.rentalEndDate)}`],
                ].map(([label, main, sub]) => (
                  <div key={label as string}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#676879' }}>
                      {label}
                    </p>
                    <p className="text-sm font-semibold">{main}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{sub}</p>
                  </div>
                ))}
              </div>

              {selectedRental.specialConditions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#676879' }}>
                    Special Conditions
                  </p>
                  <p className="text-sm rounded-lg p-3" style={{ backgroundColor: '#f5f6f8' }}>
                    {selectedRental.specialConditions}
                  </p>
                </div>
              )}

              {/* Full detail link */}
              <Link
                href={`/rentals/${selectedRental.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-semibold transition-colors hover:bg-teal-50 hover:border-teal-300"
                style={{ borderColor: '#e6e9ef', color: '#00897b' }}
              >
                Open Full Detail
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
