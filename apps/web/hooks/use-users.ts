'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
  createdAt: string;
}

interface UsersListResponse {
  data: UserSummary[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface SingleUserResponse {
  data: UserSummary;
}

interface MessageResponse {
  data: { message: string };
}

interface UsersFilters {
  page?: number;
  pageSize?: number;
  active?: boolean;
  role?: 'ADMIN' | 'STAFF';
}

const USERS_KEY = ['users'] as const;

function buildQuery(filters: UsersFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.role) params.set('role', filters.role);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: [...USERS_KEY, filters],
    queryFn: () => api.get<UsersListResponse>(`/users${buildQuery(filters)}`),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role: 'ADMIN' | 'STAFF';
    }) => api.post<SingleUserResponse>('/users', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      email?: string;
      role?: 'ADMIN' | 'STAFF';
    }) => api.patch<SingleUserResponse>(`/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SingleUserResponse>(`/users/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SingleUserResponse>(`/users/${id}/reactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post<MessageResponse>(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
