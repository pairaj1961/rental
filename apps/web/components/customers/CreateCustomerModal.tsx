'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateCustomerModal({ open, onClose }: Props) {
  const { mutate: createCustomer, isPending } = useCreateCustomer();
  const [form, setForm] = useState({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer(
      {
        customerCode: form.customerCode.trim() || undefined,
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Customer added successfully');
          setForm({ customerCode: '', companyName: '', contactPerson: '', phone: '', email: '', address: '', taxId: '' });
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e6e9ef' }}>
          <h2 className="text-lg font-bold">Add New Customer</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Customer Code — ERP reference */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Code
                <span className="ml-2 text-xs font-normal" style={{ color: '#676879' }}>ERP reference code</span>
              </label>
              <input
                value={form.customerCode}
                onChange={set('customerCode')}
                placeholder="e.g. CUST-0001"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono uppercase"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            <div className="border-t" style={{ borderColor: '#e6e9ef' }} />

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.companyName}
                onChange={set('companyName')}
                placeholder="e.g. Construction Co., Ltd."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.contactPerson}
                onChange={set('contactPerson')}
                placeholder="Full name"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Phone & Email (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="0xx-xxx-xxxx"
                  type="tel"
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={set('email')}
                  placeholder="email@company.com"
                  type="email"
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }}
                />
              </div>
            </div>

            {/* Tax ID */}
            <div>
              <label className="block text-sm font-medium mb-1">Tax ID</label>
              <input
                value={form.taxId}
                onChange={set('taxId')}
                placeholder="13-digit tax number"
                maxLength={13}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={set('address')}
                placeholder="Billing address..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
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
