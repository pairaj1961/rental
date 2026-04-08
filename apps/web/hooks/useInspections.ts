import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { InspectionType } from '@rental/shared';

export interface ChecklistItemInput {
  itemName: string;
  status: 'PASS' | 'FAIL' | 'NA';
  note?: string;
}

export interface CreateInspectionInput {
  type: InspectionType;
  inspectionDate: string;
  checklistItems: ChecklistItemInput[];
  overallCondition: number;
  damageNotes?: string;
  customerSignature?: boolean;
  photos?: string[];
}

export function useInspections(rentalId: string) {
  return useQuery({
    queryKey: ['inspections', rentalId],
    queryFn: () => api.get<any>(`/api/v1/rentals/${rentalId}/inspections`),
    enabled: !!rentalId,
  });
}

export function useInspection(rentalId: string, inspId: string) {
  return useQuery({
    queryKey: ['inspection', rentalId, inspId],
    queryFn: () => api.get<any>(`/api/v1/rentals/${rentalId}/inspections/${inspId}`),
    enabled: !!rentalId && !!inspId,
  });
}

export function useCreateInspection(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInspectionInput) =>
      api.post<any>(`/api/v1/rentals/${rentalId}/inspections`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', rentalId] });
      qc.invalidateQueries({ queryKey: ['rental', rentalId] });
    },
  });
}

export function useUpdateInspection(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspId, ...data }: CreateInspectionInput & { inspId: string }) =>
      api.put<any>(`/api/v1/rentals/${rentalId}/inspections/${inspId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['inspections', rentalId] });
      qc.invalidateQueries({ queryKey: ['inspection', rentalId, vars.inspId] });
    },
  });
}
