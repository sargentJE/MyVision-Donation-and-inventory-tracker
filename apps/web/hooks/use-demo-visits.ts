'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface DemoVisitResponse {
  data: Record<string, unknown>;
}

const DEMO_VISITS_KEY = queryKeys.demoVisits.all;

export function useStartDemoVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      equipmentId: string;
      destination?: string;
      expectedReturn?: string;
      notes?: string;
    }) => api.post<DemoVisitResponse>('/demo-visits', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEMO_VISITS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useReturnDemoVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      conditionOnReturn?: string;
      conditionOnReturnNotes?: string;
      notes?: string;
    }) => api.post<DemoVisitResponse>(`/demo-visits/${id}/return`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEMO_VISITS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}
