'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// ─── Response types ──────────────────────────────

interface EquipmentSummary {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  deviceCategory: string;
  acquisitionType: string;
  status: string;
  condition: string;
  isForSale: boolean;
  isArchived: boolean;
  acquiredAt: string;
  createdAt: string;
}

interface DonationSummary {
  id: string;
  donorName: string;
  donorOrg: string | null;
  donatedAt: string;
}

interface CurrentActivity {
  type: 'reservation' | 'loan' | 'allocation' | 'demoVisit';
  data: Record<string, unknown>;
}

interface EquipmentDetail extends EquipmentSummary {
  conditionNotes: string | null;
  notes: string | null;
  purchasePrice: string | null;
  supplier: string | null;
  warrantyExpiry: string | null;
  decommissionedAt: string | null;
  decommissionReason: string | null;
  archivedAt: string | null;
  archiveReason: string | null;
  donation: DonationSummary | null;
  currentActivity: CurrentActivity | null;
}

interface AuditEntry {
  id: string;
  event: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: { id: string; name: string; email: string };
  changedAt: string;
  note: string | null;
}

interface ListResponse {
  data: EquipmentSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface DetailResponse {
  data: EquipmentDetail;
}

interface AuditLogResponse {
  data: AuditEntry[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export type { EquipmentSummary, EquipmentDetail, AuditEntry, CurrentActivity };

// ─── Query string builder ────────────────────────

interface EquipmentFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string[];
  acquisitionType?: string[];
  deviceCategory?: string[];
  isArchived?: boolean;
  isForSale?: boolean;
}

function buildQuery(filters: EquipmentFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.q) params.set('q', filters.q);
  if (filters.isArchived !== undefined)
    params.set('isArchived', String(filters.isArchived));
  if (filters.isForSale !== undefined)
    params.set('isForSale', String(filters.isForSale));
  // Multi-value filters
  filters.status?.forEach((s) => params.append('status', s));
  filters.acquisitionType?.forEach((t) => params.append('acquisitionType', t));
  filters.deviceCategory?.forEach((c) => params.append('deviceCategory', c));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── Query hooks ─────────────────────────────────

export function useEquipmentList(filters: EquipmentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.equipment.list(filters as Record<string, unknown>),
    queryFn: () =>
      api.get<ListResponse>(`/equipment${buildQuery(filters)}`),
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: queryKeys.equipment.detail(id),
    queryFn: () => api.get<DetailResponse>(`/equipment/${id}`),
    enabled: !!id,
  });
}

export function useEquipmentAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: queryKeys.equipment.auditLog(id, page),
    queryFn: () =>
      api.get<AuditLogResponse>(
        `/equipment/${id}/audit-log?page=${page}&pageSize=20`,
      ),
    enabled: !!id,
  });
}

// ─── Mutation hooks ──────────────────────────────

const EQUIPMENT_KEY = queryKeys.equipment.all;

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<DetailResponse>('/equipment', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<DetailResponse>(`/equipment/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useDecommissionEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      reason: string;
      forceClose?: boolean;
    }) => api.post<DetailResponse>(`/equipment/${id}/decommission`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useArchiveEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<DetailResponse>(`/equipment/${id}/archive`, { reason }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useRestoreEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<DetailResponse>(`/equipment/${id}/restore`, { reason }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useFlagForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DetailResponse>(`/equipment/${id}/flag-for-sale`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useUnflagForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DetailResponse>(`/equipment/${id}/unflag-for-sale`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}

export function useReclassifyEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      acquisitionType: string;
      reason: string;
    }) => api.post<DetailResponse>(`/equipment/${id}/reclassify`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY }),
  });
}
