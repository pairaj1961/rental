'use client';

import { useState, useMemo } from 'react';
import {
  useUsers, useCreateUser, useUpdateUser,
  useDeactivateUser, useReactivateUser, useDeleteUser,
} from '@/hooks/useUsers';
import { useAuth } from '@/providers/AuthProvider';
import { initials } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Pencil, UserX, UserCheck, Trash2, Search, Plus,
  UserCog, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import UserFormModal from '@/components/users/UserFormModal';

/* ── Config ─────────────────────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  SYSTEM_ADMIN:       { bg: '#e3f2fd', color: '#0d47a1', label: 'System Admin' },
  ADMIN:              { bg: '#e3f2fd', color: '#0d47a1', label: 'Admin' },
  SALES_MANAGER:      { bg: '#e8f5e9', color: '#1b5e20', label: 'Sales Manager' },
  MANAGER:            { bg: '#e8f5e9', color: '#1b5e20', label: 'Manager' },
  SALES_REP:          { bg: '#fff8e1', color: '#e65100', label: 'Sales Rep' },
  REP:                { bg: '#fff8e1', color: '#e65100', label: 'Rep' },
  PRODUCTION_MANAGER: { bg: '#f3e5f5', color: '#4a148c', label: 'Production Manager' },
  PRODUCT_MANAGER:    { bg: '#f3e5f5', color: '#4a148c', label: 'Product Manager' },
};

/* ── Confirm banner ──────────────────────────────────────────────── */
function ConfirmBanner({
  message, onConfirm, onCancel, danger = false,
}: {
  message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div
      className="fixed inset-x-4 bottom-20 md:bottom-6 z-50 flex items-center justify-between gap-4 px-4 py-3 rounded-xl shadow-lg border text-sm animate-fade-in"
      style={{
        backgroundColor: danger ? '#fff5f6' : '#fffbeb',
        borderColor: danger ? '#e44258' : '#f59e0b',
        maxWidth: 560,
        margin: '0 auto',
        left: '50%',
        transform: 'translateX(-50%)',
        right: 'auto',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={15} className="shrink-0" style={{ color: danger ? '#e44258' : '#b45309' }} />
        <span className="font-semibold truncate">{message}</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-white transition-colors"
          style={{ borderColor: '#e6e9ef' }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: danger ? '#e44258' : '#b45309' }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, isLoading } = useUsers();

  const createUser   = useCreateUser();
  const updateUser   = useUpdateUser();
  const deactivate   = useDeactivateUser();
  const reactivate   = useReactivateUser();
  const deleteUser   = useDeleteUser();

  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [confirm,    setConfirm]    = useState<{ type: 'deactivate' | 'reactivate' | 'delete'; user: any } | null>(null);

  const isManager = ['MANAGER','SYSTEM_ADMIN','SALES_MANAGER'].includes(me?.role ?? '');
  const canManage = ['MANAGER','ADMIN','SYSTEM_ADMIN','SALES_MANAGER'].includes(me?.role ?? '');

  const filtered = useMemo(() => {
    if (!users) return [];
    return (users as any[]).filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, user: u } = confirm;
    setConfirm(null);
    try {
      if      (type === 'deactivate') { await deactivate.mutateAsync(u.id);  toast.success(`${u.name} deactivated`); }
      else if (type === 'reactivate') { await reactivate.mutateAsync(u.id);  toast.success(`${u.name} reactivated`); }
      else if (type === 'delete')     { await deleteUser.mutateAsync(u.id);  toast.success(`${u.name} deleted`); }
    } catch (err: any) {
      toast.error(err?.message ?? 'An error occurred');
    }
  };

  const totalCount = (users as any[])?.length ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      {/* Modal */}
      <UserFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        user={editTarget}
        onCreate={(data) => createUser.mutateAsync(data)}
        onUpdate={(data) => updateUser.mutateAsync(data)}
      />

      {/* Confirm banner */}
      {confirm && (
        <ConfirmBanner
          message={
            confirm.type === 'deactivate' ? `Deactivate ${confirm.user.name}?` :
            confirm.type === 'reactivate' ? `Reactivate ${confirm.user.name}?` :
            `Permanently delete ${confirm.user.name}? This cannot be undone.`
          }
          danger={confirm.type === 'delete'}
          onConfirm={executeConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <UserCog size={20} style={{ color: '#00897b' }} />
            <h1 className="page-title" style={{ margin: 0 }}>Users</h1>
          </div>
          <p className="page-subtitle">{totalCount} account{totalCount !== 1 ? 's' : ''}</p>
        </div>
        {isManager && (
          <button
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00897b' }}
          >
            <Plus size={16} />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#676879' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-3 text-sm rounded"
            style={{ height: 36, border: '1px solid #e6e9ef' }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm px-2 rounded"
          style={{ height: 36, border: '1px solid #e6e9ef' }}
        >
          <option value="">All roles</option>
          {Object.entries(ROLE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-[76px] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#676879' }}>
          <UserCog size={36} className="mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => {
            const isSelf = u.id === me?.id;
            const roleCfg = ROLE_CONFIG[u.role] ?? { bg: '#f5f6f8', color: '#323338', label: u.role };
            return (
              <div
                key={u.id}
                className="card p-4 flex items-center gap-4 transition-opacity"
                style={{ opacity: u.active ? 1 : 0.65 }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: u.active ? '#e0f2f1' : '#f0f0f0',
                    color: u.active ? '#006b5e' : '#aaaaaa',
                  }}
                >
                  {initials(u.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold text-sm truncate">{u.name}</p>
                    {isSelf && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
                        <ShieldCheck size={10} /> You
                      </span>
                    )}
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: roleCfg.bg, color: roleCfg.color }}
                    >
                      {roleCfg.label}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: u.active ? '#e8f5e9' : '#f5f5f5',
                        color: u.active ? '#2e7d32' : '#9e9e9e',
                      }}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#676879' }}>{u.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#c4c4c4' }}>
                    Joined {new Date(u.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => { setEditTarget(u); setShowModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#e6e9ef', color: '#323338' }}
                    >
                      <Pencil size={12} />
                      Edit
                    </button>

                    {!isSelf && (
                      <>
                        {u.active ? (
                          <button
                            onClick={() => setConfirm({ type: 'deactivate', user: u })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-amber-50 transition-colors"
                            style={{ borderColor: '#f59e0b', color: '#b45309' }}
                          >
                            <UserX size={12} />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirm({ type: 'reactivate', user: u })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-green-50 transition-colors"
                            style={{ borderColor: '#00897b', color: '#006b5e' }}
                          >
                            <UserCheck size={12} />
                            Activate
                          </button>
                        )}
                        {isManager && !u.active && (
                          <button
                            onClick={() => setConfirm({ type: 'delete', user: u })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-red-50 transition-colors"
                            style={{ borderColor: '#e44258', color: '#e44258' }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
