import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { RentalStatus } from '@rental/shared';

export function useRentals(filters?: Record<string, string | number>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  return useQuery({
    queryKey: ['rentals', filters],
    queryFn: () => api.get<any>(`/api/v1/rentals?${params}`),
  });
}

export function useRental(id: string) {
  return useQuery({
    queryKey: ['rental', id],
    queryFn: () => api.get<any>(`/api/v1/rentals/${id}`),
    enabled: !!id,
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/api/v1/rentals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rentals'] }),
  });
}

export function useTransitionRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: RentalStatus }) =>
      api.post<any>(`/api/v1/rentals/${id}/transition`, { to }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['rentals'] });
      qc.invalidateQueries({ queryKey: ['rental', vars.id] });
    },
  });
}

export function useSwapEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, replacementEquipmentId, reason }: { id: string; replacementEquipmentId: string; reason?: string }) =>
      api.post<any>(`/api/v1/rentals/${id}/swap-equipment`, { replacementEquipmentId, reason }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['rentals'] });
      qc.invalidateQueries({ queryKey: ['rental', vars.id] });
      qc.invalidateQueries({ queryKey: ['rental-timeline', vars.id] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useRentalTimeline(id: string) {
  return useQuery({
    queryKey: ['rental-timeline', id],
    queryFn: () => api.get<any>(`/api/v1/rentals/${id}/timeline`),
    enabled: !!id,
  });
}
