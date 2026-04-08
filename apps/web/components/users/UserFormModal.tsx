'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  user?: any; // populated when editing
  onCreate: (data: any) => Promise<any>;
  onUpdate: (data: any) => Promise<any>;
}

const ROLE_OPTIONS = [
  { value: 'MANAGER',            label: 'Manager' },
  { value: 'ADMIN',              label: 'Admin' },
  { value: 'SALES_MANAGER',      label: 'Sales Manager' },
  { value: 'SALES_REP',          label: 'Sales Rep' },
  { value: 'REP',                label: 'Rep' },
  { value: 'PRODUCT_MANAGER',    label: 'Product Manager' },
  { value: 'PRODUCTION_MANAGER', label: 'Production Manager' },
];

const empty = { name: '', email: '', role: 'SALES_REP', password: '', confirmPassword: '' };

export default function UserFormModal({ open, onClose, user, onCreate, onUpdate }: Props) {
  const [form, setForm] = useState(empty);
  const [showPw, setShowPw] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isEdit = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        setForm({ name: user.name, email: user.email, role: user.role, password: '', confirmPassword: '' });
      } else {
        setForm(empty);
      }
      setShowPw(false);
    }
  }, [open, user]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required'); return; }
    if (form.password && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password && form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsPending(true);
    try {
      if (isEdit) {
        const payload: any = { id: user.id, name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await onUpdate(payload);
        toast.success('User updated');
      } else {
        await onCreate({ name: form.name, email: form.email, role: form.role, password: form.password });
        toast.success('User created');
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-lg font-bold">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="John Smith"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="john@toolsact.co.th"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-1">Role <span className="text-red-500">*</span></label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Password {!isEdit && <span className="text-red-500">*</span>}
                {isEdit && <span className="text-xs font-normal ml-1" style={{ color: '#676879' }}>(leave blank to keep unchanged)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={isEdit ? '••••••••' : 'Min. 8 characters'}
                  className="w-full border rounded px-3 py-2 pr-10 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#676879' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password — only show when password is being set */}
            {form.password && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password <span className="text-red-500">*</span></label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: form.confirmPassword && form.confirmPassword !== form.password ? '#e44258' : '#e6e9ef' }}
                />
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs mt-1" style={{ color: '#e44258' }}>Passwords do not match</p>
                )}
              </div>
            )}
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
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
