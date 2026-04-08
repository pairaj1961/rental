import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useMaintenanceLogs(rentalId: string) {
  return useQuery({
    queryKey: ['maintenance', 'rental', rentalId],
    queryFn: () => api.get<any>(`/api/v1/rentals/${rentalId}/maintenance`),
    enabled: !!rentalId,
  });
}

export function useEquipmentMaintenanceLogs(equipmentId: string) {
  return useQuery({
    queryKey: ['maintenance', 'equipment', equipmentId],
    queryFn: () => api.get<any>(`/api/v1/equipment/${equipmentId}/maintenance`),
    enabled: !!equipmentId,
  });
}

export function useCreateMaintenanceLog(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>(`/api/v1/rentals/${rentalId}/maintenance`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'rental', rentalId] });
    },
  });
}

export function useUpdateMaintenanceLog(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, ...data }: any) =>
      api.put<any>(`/api/v1/rentals/${rentalId}/maintenance/${logId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'rental', rentalId] });
    },
  });
}
