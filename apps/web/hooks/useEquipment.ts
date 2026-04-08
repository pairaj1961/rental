import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '@/lib/api-client';
import { EquipmentStatus } from '@rental/shared';

export function useEquipmentList(filters?: { status?: EquipmentStatus; category?: string; search?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => api.get<any>(`/api/v1/equipment?${params}`),
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment-detail', id],
    queryFn: () => api.get<any>(`/api/v1/equipment/${id}`),
    enabled: !!id,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/api/v1/equipment', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put<any>(`/api/v1/equipment/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['equipment-detail', vars.id] });
    },
  });
}

export function useEquipmentPhotos(equipmentId: string) {
  return useQuery({
    queryKey: ['equipment-photos', equipmentId],
    queryFn: () => api.get<any>(`/api/v1/equipment/${equipmentId}/photos`),
    enabled: !!equipmentId,
  });
}

export function useUploadPhoto(equipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return uploadFile(`/api/v1/equipment/${equipmentId}/photos`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-photos', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment-detail', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useDeletePhoto(equipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.delete<any>(`/api/v1/equipment/${equipmentId}/photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-photos', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment-detail', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useSetCoverPhoto(equipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      api.patch<any>(`/api/v1/equipment/${equipmentId}/photos/${photoId}`, { isCover: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-photos', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment-detail', equipmentId] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}
