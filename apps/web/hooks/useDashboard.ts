import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<any>('/api/v1/dashboard'),
  });
}
