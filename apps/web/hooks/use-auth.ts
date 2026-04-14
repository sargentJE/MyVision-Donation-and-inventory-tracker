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

// After a successful login the server sets httpOnly cookies. A privacy
// extension, AV with HTTPS inspection, or strict browser setting can
// silently reject them — the next authenticated request would 401 and
// cascade into a misleading "Session expired" redirect. Verify here.
async function verifyCookiesAccepted(): Promise<UserSummary> {
  try {
    const me = await api.get<{ data: UserSummary }>('/auth/me', {
      skipAuthRedirect: true,
    });
    return me.data;
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      const rejected = new Error(
        'Session cookies were rejected by the browser.',
      ) as Error & { code: string };
      rejected.code = 'COOKIES_REJECTED';
      throw rejected;
    }
    throw err;
  }
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
      // skipAuthRedirect: a 401 here means wrong credentials, not an
      // expired session — let the login page show an inline error rather
      // than cascading into a misleading "Session expired" redirect.
      await api.post<AuthResponse>('/auth/login', credentials, {
        skipAuthRedirect: true,
      });
      return verifyCookiesAccepted();
    },
    // Cancel the mount-time /auth/refresh so its stale 401 can't land
    // after our successful login and wipe the state we're about to set.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.user });
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
