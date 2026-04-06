'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface ReservationResponse {
  data: Record<string, unknown>;
}

const RESERVATIONS_KEY = ['reservations'] as const;

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      equipmentId: string;
      clientId: string;
      expiresAt?: string;
      notes?: string;
    }) => api.post<ReservationResponse>('/reservations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ReservationResponse>(`/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useConvertReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      expectedReturn?: string;
      conditionAtLoan?: string;
      conditionAtLoanNotes?: string;
      notes?: string;
    }) => api.post<ReservationResponse>(`/reservations/${id}/convert`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}
