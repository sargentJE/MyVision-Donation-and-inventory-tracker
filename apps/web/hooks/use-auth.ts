'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
  createdAt: string;
}

interface AuthResponse {
  data: { user: UserSummary };
}

interface MessageResponse {
  data: { message: string };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // On mount, attempt to refresh the session to get the current user.
  // If no valid session exists, the query fails silently (no redirect).
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const res = await api.post<AuthResponse>('/auth/refresh', undefined, {
        skipAuthRedirect: true,
      });
      return res.data.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — JWT lasts 60m
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', credentials);
      return res.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.user, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post<MessageResponse>('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.user, null);
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data && !isError,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
