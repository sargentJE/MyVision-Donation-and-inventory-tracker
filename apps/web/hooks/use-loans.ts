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

interface LoanSummary {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  clientId: string;
  client: ClientSummary;
  loanedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  conditionAtLoan: string | null;
  closedReason: string | null;
}

export type { LoanSummary };

interface ListResponse {
  data: LoanSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface DetailResponse {
  data: Record<string, unknown>;
}

interface LoansFilters {
  page?: number;
  pageSize?: number;
  equipmentId?: string;
  clientId?: string;
  active?: boolean;
  overdue?: boolean;
}

function buildQuery(filters: LoansFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.equipmentId) params.set('equipmentId', filters.equipmentId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.overdue !== undefined) params.set('overdue', String(filters.overdue));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const LOANS_KEY = queryKeys.loans.all;

export function useLoans(filters: LoansFilters = {}) {
  return useQuery({
    queryKey: queryKeys.loans.list(filters as Record<string, unknown>),
    queryFn: () => api.get<ListResponse>(`/loans${buildQuery(filters)}`),
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: queryKeys.loans.detail(id),
    queryFn: () => api.get<DetailResponse>(`/loans/${id}`),
    enabled: !!id,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      equipmentId: string;
      clientId: string;
      expectedReturn?: string;
      conditionAtLoan?: string;
      conditionAtLoanNotes?: string;
      notes?: string;
    }) => api.post<DetailResponse>('/loans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useReturnLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      conditionAtReturn?: string;
      conditionAtReturnNotes?: string;
      notes?: string;
    }) => api.post<DetailResponse>(`/loans/${id}/return`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useConvertLoanToAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.post<DetailResponse>(`/loans/${id}/convert-to-allocation`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}
