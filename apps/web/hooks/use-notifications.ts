'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface NotificationSummary {
  id: string;
  type: 'LOAN_OVERDUE' | 'RESERVATION_EXPIRED' | 'DEMO_VISIT_OVERDUE';
  message: string;
  relatedEquipmentId: string | null;
  relatedEquipmentName: string | null;
  relatedLoanId: string | null;
  relatedReservationId: string | null;
  relatedDemoVisitId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  isRead: boolean;
}

interface ListResponse {
  data: NotificationSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CountResponse {
  data: { count: number };
}

const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => api.get<CountResponse>('/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

export function useNotifications(filters: { page?: number; resolved?: boolean; read?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  params.set('pageSize', '20');
  if (filters.resolved !== undefined) params.set('resolved', String(filters.resolved));
  if (filters.read !== undefined) params.set('read', String(filters.read));
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.notifications.list(filters as Record<string, unknown>),
    queryFn: () => api.get<ListResponse>(`/notifications?${qs}`),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: { success: boolean } }>(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ data: { marked: number } }>('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
