'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface AllocationSummary {
  id: string;
  equipmentId: string;
  clientId: string;
  client: { id: string; charitylogId: string; displayName: string };
  allocatedAt: string;
  originatingLoanId: string | null;
}

interface ListResponse {
  data: AllocationSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface DetailResponse {
  data: Record<string, unknown>;
}

interface AllocationsFilters {
  page?: number;
  pageSize?: number;
  clientId?: string;
  equipmentId?: string;
}

function buildQuery(filters: AllocationsFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.equipmentId) params.set('equipmentId', filters.equipmentId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useAllocations(filters: AllocationsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.allocations.list(filters as Record<string, unknown>),
    queryFn: () =>
      api.get<ListResponse>(`/allocations${buildQuery(filters)}`),
  });
}

export function useAllocation(id: string) {
  return useQuery({
    queryKey: queryKeys.allocations.detail(id),
    queryFn: () => api.get<DetailResponse>(`/allocations/${id}`),
    enabled: !!id,
  });
}

export function useCreateAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      equipmentId: string;
      clientId: string;
      notes?: string;
    }) => api.post<DetailResponse>('/allocations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}
