'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/useCustomers';
import { useEquipmentList } from '@/hooks/useEquipment';
import { useCreateRental } from '@/hooks/useRentals';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, CheckCircle2 } from 'lucide-react';
import { EquipmentStatus } from '@rental/shared';

export default function NewRentalPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    customerId: '',
    jobSiteId: '',
    equipmentId: '',
    rentalStartDate: '',
    rentalEndDate: '',
    specialConditions: '',
  });

  // Step 2 filter state
  const [eqSearch, setEqSearch] = useState('');
  const [eqCategory, setEqCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: customersData } = useCustomers({ page: 1 });
  const customers = customersData ?? [];

  const { data: customer } = useQuery({
    queryKey: ['customer', form.customerId],
    queryFn: () => api.get<any>(`/api/v1/customers/${form.customerId}`),
    enabled: !!form.customerId,
  });

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: () => api.get<any>('/api/v1/equipment/categories'),
  });
  const categories: string[] = categoriesData ?? [];

  // Fetch all available equipment with server-side filters
  const { data: equipmentData, isLoading: eqLoading } = useEquipmentList({
    status: EquipmentStatus.AVAILABLE,
    ...(eqSearch && { search: eqSearch }),
    ...(eqCategory && { category: eqCategory }),
    page: 1,
  });
  const equipment = equipmentData ?? [];

  const createRental = useCreateRental();

  const handleSubmit = async () => {
    try {
      await createRental.mutateAsync(form);
      toast.success('Rental created successfully');
      router.push('/rentals');
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred');
    }
  };

  const labelStyle = { color: '#676879', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 };
  const inputStyle = { height: 36, borderRadius: 4, borderColor: '#e6e9ef', border: '1px solid', padding: '0 12px', fontSize: 14, width: '100%', outline: 'none' };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">New Rental</h1>
        <p className="text-sm mt-1" style={{ color: '#676879' }}>Fill in rental details</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center mb-8">
        {['Select Customer', 'Select Equipment', 'Dates & Terms', 'Confirm'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{
                  backgroundColor: i + 1 <= step ? '#00897b' : '#e6e9ef',
                  color: i + 1 <= step ? 'white' : '#676879',
                }}
              >
                {i + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block" style={{ color: i + 1 === step ? '#00897b' : '#676879' }}>{s}</span>
            </div>
            {i < 3 && <div className="h-px flex-1 mx-2" style={{ backgroundColor: i + 1 < step ? '#00897b' : '#e6e9ef', minWidth: 20 }} />}
          </div>
        ))}
      </div>

      <div
        className="bg-white rounded-lg border p-6"
        style={{ borderColor: '#e6e9ef' }}
      >
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p style={labelStyle}>Customer</p>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value, jobSiteId: '' })}
                style={inputStyle}
              >
                <option value="">-- Select customer --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            {customer && customer.jobSites?.length > 0 && (
              <div>
                <p style={labelStyle}>Job Site</p>
                <select
                  value={form.jobSiteId}
                  onChange={(e) => setForm({ ...form, jobSiteId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">-- Select job site --</option>
                  {customer.jobSites.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p style={labelStyle}>Select Equipment (available only)</p>
              <span className="text-xs" style={{ color: '#676879' }}>{equipment.length} items</span>
            </div>

            {/* Search + Filter bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={eqSearch}
                  onChange={(e) => setEqSearch(e.target.value)}
                  placeholder="Search model, serial number..."
                  className="w-full pl-8 pr-3 border rounded text-sm outline-none focus:border-teal-500"
                  style={{ height: 34, borderColor: '#e6e9ef' }}
                />
                {eqSearch && (
                  <button onClick={() => setEqSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 border rounded text-sm font-medium transition-colors hover:bg-gray-50"
                style={{
                  height: 34,
                  borderColor: (eqCategory) ? '#00897b' : '#e6e9ef',
                  color: (eqCategory) ? '#00897b' : '#676879',
                  backgroundColor: (eqCategory) ? '#e0f2f1' : 'white',
                }}
              >
                <SlidersHorizontal size={13} />
                Filter
                {eqCategory && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
              </button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: '#e6e9ef', backgroundColor: '#f9fafb' }}>
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#676879' }}>Category</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEqCategory('')}
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                      style={{
                        borderColor: !eqCategory ? '#00897b' : '#e6e9ef',
                        backgroundColor: !eqCategory ? '#00897b' : 'white',
                        color: !eqCategory ? 'white' : '#676879',
                      }}
                    >
                      All
                    </button>
                    {categories.map((cat: string) => (
                      <button
                        key={cat}
                        onClick={() => setEqCategory(eqCategory === cat ? '' : cat)}
                        className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                        style={{
                          borderColor: eqCategory === cat ? '#00897b' : '#e6e9ef',
                          backgroundColor: eqCategory === cat ? '#00897b' : 'white',
                          color: eqCategory === cat ? 'white' : '#676879',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {eqCategory && (
                  <button
                    onClick={() => { setEqCategory(''); }}
                    className="text-xs flex items-center gap-1"
                    style={{ color: '#00897b' }}
                  >
                    <X size={11} /> Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Equipment list — scrollable, max height */}
            <div className="overflow-y-auto rounded-lg border" style={{ maxHeight: 380, borderColor: '#e6e9ef' }}>
              {eqLoading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-14 rounded-lg" />
                  ))}
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: '#676879' }}>
                  No equipment matches the criteria
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#e6e9ef' }}>
                  {equipment.map((eq: any) => {
                    const selected = form.equipmentId === eq.id;
                    return (
                      <div
                        key={eq.id}
                        onClick={() => setForm({ ...form, equipmentId: eq.id })}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ backgroundColor: selected ? '#e0f2f1' : undefined }}
                      >
                        {/* Thumbnail */}
                        {eq.coverPhoto?.urls?.thumb ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${eq.coverPhoto.urls.thumb}`}
                            alt={eq.modelName}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: '#f5f6f8' }}>
                            🔧
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{eq.modelName}</p>
                          <p className="text-xs font-mono truncate" style={{ color: '#676879' }}>{eq.serialNumber}</p>
                        </div>

                        {/* Category pill */}
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
                          {eq.category}
                        </span>

                        {/* Status badge — always AVAILABLE in this list */}
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium" style={{ backgroundColor: '#00c87520', color: '#00a65a', border: '1px solid #00c87540' }}>
                          Available
                        </span>

                        {/* Rating */}
                        <span className="text-xs flex-shrink-0" style={{ color: '#fdab3d' }}>
                          {'★'.repeat(eq.conditionRating ?? 0)}
                        </span>

                        {/* Selected check */}
                        {selected && <CheckCircle2 size={18} style={{ color: '#00897b', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected summary */}
            {form.equipmentId && (() => {
              const sel = equipment.find((e: any) => e.id === form.equipmentId);
              return sel ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
                  <CheckCircle2 size={15} />
                  Selected: {sel.modelName} ({sel.serialNumber})
                </div>
              ) : null;
            })()}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={labelStyle}>Start Date</p>
                <input
                  type="date"
                  value={form.rentalStartDate}
                  onChange={(e) => setForm({ ...form, rentalStartDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <p style={labelStyle}>End Date</p>
                <input
                  type="date"
                  value={form.rentalEndDate}
                  onChange={(e) => setForm({ ...form, rentalEndDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <p style={labelStyle}>Special Conditions (if any)</p>
              <textarea
                value={form.specialConditions}
                onChange={(e) => setForm({ ...form, specialConditions: e.target.value })}
                rows={3}
                placeholder="e.g. PM service every 250 hours..."
                className="w-full border rounded p-2 text-sm outline-none resize-none"
                style={{ borderColor: '#e6e9ef', borderRadius: 4 }}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Confirm Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#676879' }}>Customer</p>
                <p>{customers.find((c: any) => c.id === form.customerId)?.companyName}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#676879' }}>Equipment</p>
                <p>{equipment.find((e: any) => e.id === form.equipmentId)?.modelName}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#676879' }}>Start Date</p>
                <p>{form.rentalStartDate}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#f5f6f8' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#676879' }}>End Date</p>
                <p>{form.rentalEndDate}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="px-4 py-2 border rounded text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: '#e6e9ef' }}
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && (!form.customerId || !form.jobSiteId)) ||
              (step === 2 && !form.equipmentId) ||
              (step === 3 && (!form.rentalStartDate || !form.rentalEndDate))
            }
            className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#00897b' }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createRental.isPending}
            className="px-6 py-2 text-white rounded text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#00897b' }}
          >
            {createRental.isPending ? 'Creating...' : '✓ Create Rental'}
          </button>
        )}
      </div>
    </div>
  );
}
