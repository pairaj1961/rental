'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomers } from '@/hooks/useCustomers';
import { Search, Plus, Pencil, Users, Phone, Mail, MapPin } from 'lucide-react';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const { data, isLoading } = useCustomers({ search });
  const customers: any[] = data ?? [];

  return (
    <div className="p-6 max-w-full">
      <CreateCustomerModal open={showCreate} onClose={() => setShowCreate(false)} />
      <EditCustomerModal open={!!editTarget} onClose={() => setEditTarget(null)} customer={editTarget} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{isLoading ? '…' : `${customers.length} companies`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#00897b' }}
        >
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company name…"
            className="pl-8 pr-3 text-sm rounded"
            style={{ height: 36, width: 260, border: '1px solid #e6e9ef' }}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#676879' }}>
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-sm">No customers found</p>
          <p className="text-xs mt-1 opacity-60">Add your first customer to get started</p>
        </div>
      ) : (

        /* Desktop table */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Job Sites</th>
                  <th className="w-36" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.customerCode ? (
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}
                        >
                          {c.customerCode}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#c4c4c4' }}>—</span>
                      )}
                    </td>
                    <td className="font-semibold text-sm">{c.companyName}</td>
                    <td className="text-sm" style={{ color: '#676879' }}>{c.contactPerson}</td>
                    <td>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1 text-sm hover:underline"
                          style={{ color: '#0073ea' }}
                        >
                          <Phone size={11} />
                          {c.phone}
                        </a>
                      ) : <span className="text-xs" style={{ color: '#c4c4c4' }}>—</span>}
                    </td>
                    <td>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-1 text-sm hover:underline truncate max-w-[180px] block"
                          style={{ color: '#0073ea' }}
                        >
                          <Mail size={11} className="shrink-0" />
                          {c.email}
                        </a>
                      ) : <span className="text-xs" style={{ color: '#c4c4c4' }}>—</span>}
                    </td>
                    <td>
                      <Link
                        href={`/customers/${c.id}`}
                        className="flex items-center gap-1 text-sm font-medium hover:underline"
                        style={{ color: '#676879' }}
                      >
                        <MapPin size={11} />
                        {c._count?.jobSites ?? 0} site{c._count?.jobSites !== 1 ? 's' : ''}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditTarget(c)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                          style={{ borderColor: '#e6e9ef', color: '#676879' }}
                        >
                          <Pencil size={11} />
                          Edit
                        </button>
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50 hover:border-blue-300"
                          style={{ borderColor: '#e6e9ef', color: '#0073ea' }}
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
