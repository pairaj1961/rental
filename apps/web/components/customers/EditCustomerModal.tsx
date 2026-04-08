'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: any;
}

export default function EditCustomerModal({ open, onClose, customer }: Props) {
  const { mutate: updateCustomer, isPending } = useUpdateCustomer();

  const [form, setForm] = useState({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    taxId: '',
    address: '',
  });

  useEffect(() => {
    if (customer && open) {
      setForm({
        customerCode: customer.customerCode ?? '',
        companyName: customer.companyName ?? '',
        contactPerson: customer.contactPerson ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        taxId: customer.taxId ?? '',
        address: customer.address ?? '',
      });
    }
  }, [customer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) { toast.error('Please enter company name'); return; }
    if (!form.phone.trim()) { toast.error('Please enter phone number'); return; }

    updateCustomer(
      {
        id: customer.id,
        customerCode: form.customerCode.trim() || undefined,
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        address: form.address.trim() || undefined,
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
          <h2 className="text-lg font-bold">Edit Customer</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>

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
                onChange={(e) => setForm((f) => ({ ...f, customerCode: e.target.value }))}
                placeholder="e.g. CUST-0001"
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono"
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
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500"
                  style={{ borderColor: '#e6e9ef' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={3}
                placeholder="Billing address..."
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                style={{ borderColor: '#e6e9ef' }}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#e6e9ef' }}>
            <button
              type="button" onClick={onClose} disabled={isPending}
              className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#e6e9ef' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#00897b' }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
