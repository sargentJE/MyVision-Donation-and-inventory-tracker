// Centralised query key factory — all TanStack Query cache keys live here.
// Using const arrays ensures TypeScript catches key mismatches at compile time.

export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
  },
  dashboard: ['dashboard'] as const,
  equipment: {
    all: ['equipment'] as const,
    list: (filters: Record<string, unknown>) =>
      ['equipment', 'list', filters] as const,
    detail: (id: string) => ['equipment', id] as const,
    auditLog: (id: string, page: number) =>
      ['equipment', id, 'audit-log', page] as const,
  },
  loans: {
    all: ['loans'] as const,
    list: (filters: Record<string, unknown>) =>
      ['loans', 'list', filters] as const,
    detail: (id: string) => ['loans', id] as const,
  },
  reservations: {
    all: ['reservations'] as const,
    list: (filters: Record<string, unknown>) =>
      ['reservations', 'list', filters] as const,
    detail: (id: string) => ['reservations', id] as const,
  },
  allocations: {
    all: ['allocations'] as const,
    list: (filters: Record<string, unknown>) =>
      ['allocations', 'list', filters] as const,
    detail: (id: string) => ['allocations', id] as const,
  },
  demoVisits: {
    all: ['demo-visits'] as const,
    list: (filters: Record<string, unknown>) =>
      ['demo-visits', 'list', filters] as const,
    detail: (id: string) => ['demo-visits', id] as const,
  },
  clients: {
    search: (q: string) => ['clients', 'search', q] as const,
    list: (filters: Record<string, unknown>) =>
      ['clients', 'list', filters] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  donations: {
    list: (filters: Record<string, unknown>) =>
      ['donations', 'list', filters] as const,
    detail: (id: string) => ['donations', id] as const,
  },
  notifications: {
    list: (filters: Record<string, unknown>) =>
      ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;
