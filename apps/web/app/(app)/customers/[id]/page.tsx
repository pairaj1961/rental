'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCustomer } from '@/hooks/useCustomers';
import { ArrowLeft, MapPin, Phone, Mail, Pencil } from 'lucide-react';
import EditCustomerModal from '@/components/customers/EditCustomerModal';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: customer, isLoading } = useCustomer(id);
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-32 rounded-lg" />
      </div>
    );
  }

  if (!customer) return <div className="p-6">Customer not found</div>;

  return (
    <div className="p-6 max-w-3xl">
      <EditCustomerModal open={showEdit} onClose={() => setShowEdit(false)} customer={customer} />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-4 hover:underline"
        style={{ color: '#676879' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {customer.customerCode && (
              <span
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}
              >
                {customer.customerCode}
              </span>
            )}
            <h1 className="text-xl font-bold">{customer.companyName}</h1>
          </div>
          {customer.taxId && (
            <p className="text-xs font-mono mt-1" style={{ color: '#676879' }}>Tax ID: {customer.taxId}</p>
          )}
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium border rounded hover:bg-gray-50 transition-colors shrink-0"
          style={{ borderColor: '#e6e9ef', color: '#0073ea' }}
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
      <div className="mb-4" />

      <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: '#e6e9ef' }}>
        <h3 className="font-semibold text-sm mb-3">Contact Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span style={{ color: '#676879' }}>Contact:</span>
            <span className="font-medium">{customer.contactPerson}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={14} style={{ color: '#676879' }} />
            <a href={`tel:${customer.phone}`} style={{ color: '#0073ea' }}>{customer.phone}</a>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} style={{ color: '#676879' }} />
              <a href={`mailto:${customer.email}`} style={{ color: '#0073ea' }}>{customer.email}</a>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: '#676879' }} />
              <span>{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      {customer.jobSites?.length > 0 && (
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: '#e6e9ef' }}>
          <h3 className="font-semibold text-sm mb-3">Job Sites ({customer.jobSites.length})</h3>
          <div className="space-y-3">
            {customer.jobSites.map((site: any) => (
              <div key={site.id} className="p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                <p className="font-medium text-sm">{site.siteName}</p>
                <div className="flex items-start gap-1 mt-1">
                  <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: '#676879' }} />
                  <p className="text-xs" style={{ color: '#676879' }}>{site.siteAddress}</p>
                </div>
                {site.siteContactPerson && (
                  <p className="text-xs mt-1" style={{ color: '#676879' }}>
                    Manager: {site.siteContactPerson}
                    {site.sitePhone && (
                      <> · <a href={`tel:${site.sitePhone}`} style={{ color: '#0073ea' }}>{site.sitePhone}</a></>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
