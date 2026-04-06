import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Retry once on failure before showing error
        retry: 1,
        // Don't refetch on window focus by default (explicit invalidation preferred)
        refetchOnWindowFocus: false,
      },
    },
  });
}
