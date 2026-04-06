'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DonationSummary {
  id: string;
  donorName: string;
  donorOrg: string | null;
  donatedAt: string;
  acknowledgementSent: boolean;
  itemCount: number;
}

interface DonationDetail {
  id: string;
  donorName: string;
  donorOrg: string | null;
  donatedAt: string;
  acknowledgementSent: boolean;
  notes: string | null;
  items: Array<{
    id: string;
    name: string;
    status: string;
    condition: string;
    createdAt: string;
  }>;
}

interface ListResponse {
  data: DonationSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface DetailResponse {
  data: DonationDetail;
}

interface SingleResponse {
  data: { id: string; donorName: string; acknowledgementSent: boolean };
}

export type { DonationSummary, DonationDetail };

const DONATIONS_KEY = ['donations'] as const;

interface DonationsFilters {
  page?: number;
  pageSize?: number;
  acknowledgementSent?: boolean;
}

function buildQuery(filters: DonationsFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.acknowledgementSent !== undefined)
    params.set('acknowledgementSent', String(filters.acknowledgementSent));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useDonations(filters: DonationsFilters = {}) {
  return useQuery({
    queryKey: [...DONATIONS_KEY, filters],
    queryFn: () => api.get<ListResponse>(`/donations${buildQuery(filters)}`),
  });
}

export function useDonation(id: string) {
  return useQuery({
    queryKey: [...DONATIONS_KEY, id],
    queryFn: () => api.get<DetailResponse>(`/donations/${id}`),
    enabled: !!id,
  });
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      donorName: string;
      donorOrg?: string;
      donatedAt: string;
      notes?: string;
    }) => api.post<SingleResponse>('/donations', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: DONATIONS_KEY }),
  });
}

export function useUpdateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      donorName?: string;
      donorOrg?: string;
      donatedAt?: string;
      notes?: string;
    }) => api.patch<DetailResponse>(`/donations/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: DONATIONS_KEY }),
  });
}

export function useToggleAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SingleResponse>(`/donations/${id}/acknowledge`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: DONATIONS_KEY }),
  });
}
