import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60 seconds, so identical queries on one screen share one request.
      staleTime: 60 * 1000,
      // Keep unused data in memory for 10 minutes so navigating back is instant.
      gcTime: 10 * 60 * 1000,
      // Do not re-fetch just because the user switched browser tabs.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
