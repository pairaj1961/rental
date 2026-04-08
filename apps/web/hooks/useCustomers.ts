import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useCustomers(filters?: { search?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => api.get<any>(`/api/v1/customers?${params}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<any>(`/api/v1/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/api/v1/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put<any>(`/api/v1/customers/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', vars.id] });
    },
  });
}

export function useCreateJobSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...data }: any) =>
      api.post<any>(`/api/v1/customers/${customerId}/job-sites`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
    },
  });
}
