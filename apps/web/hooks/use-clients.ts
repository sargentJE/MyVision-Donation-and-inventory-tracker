'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface ClientSummary {
  id: string;
  charitylogId: string;
  displayName: string;
  isAnonymised: boolean;
}

interface ClientLoanSummary {
  id: string;
  equipmentId: string;
  equipmentName: string;
  loanedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  closedReason: string | null;
}

interface ClientAllocationSummary {
  id: string;
  equipmentId: string;
  equipmentName: string;
  allocatedAt: string;
  originatingLoanId: string | null;
}

interface ClientDetail extends ClientSummary {
  createdAt: string;
  anonymisedAt: string | null;
  loans: ClientLoanSummary[];
  allocations: ClientAllocationSummary[];
}

interface SearchResponse {
  data: ClientSummary[];
}

interface ListResponse {
  data: ClientSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface DetailResponse {
  data: ClientDetail;
}

interface SingleResponse {
  data: ClientSummary;
}

export type { ClientSummary, ClientDetail };

interface ClientsFilters {
  page?: number;
  pageSize?: number;
  isAnonymised?: boolean;
}

function buildQuery(filters: ClientsFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.isAnonymised !== undefined)
    params.set('isAnonymised', String(filters.isAnonymised));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const CLIENTS_KEY = ['clients'] as const;

export function useClientSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.clients.search(q),
    queryFn: () => api.get<SearchResponse>(`/clients/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}

export function useClients(filters: ClientsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () => api.get<ListResponse>(`/clients${buildQuery(filters)}`),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => api.get<DetailResponse>(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { charitylogId: string; displayName: string }) =>
      api.post<SingleResponse>('/clients', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useAnonymiseClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SingleResponse>(`/clients/${id}/anonymise`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}
