'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface ActivityEntry {
  id: string;
  event: string;
  equipmentId: string | null;
  equipmentName: string | null;
  changedBy: string;
  changedAt: string;
  note: string | null;
}

interface UtilisationData {
  totalGiveable: number;
  inUse: number;
  available: number;
  utilisation: number;
}

interface DashboardData {
  stockSummary: { total: number; byStatus: Record<string, number> };
  activeLoans: number;
  overdueLoans: number;
  activeDemoVisits: number;
  forSaleCount: number;
  unreadNotifications: number;
  byCategory: Record<string, number>;
  utilisationData: UtilisationData;
  recentActivity: ActivityEntry[];
}

interface DashboardResponse {
  data: DashboardData;
}

export type { DashboardData, ActivityEntry };

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
    staleTime: 60_000,
  });
}
