'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface ProfileResponse {
  data: UserSummary;
}

interface MessageResponse {
  data: { message: string };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      api.patch<ProfileResponse>('/auth/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post<MessageResponse>('/auth/change-password', data, {
        skipAuthRedirect: true,
      }),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.user, null);
      queryClient.clear();
      router.push('/login');
    },
  });
}
