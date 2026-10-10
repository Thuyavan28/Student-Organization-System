import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '../api/axiosInstance';

// Thin wrapper over useQuery so existing imports do not break.
// request() must return { data, meta } or { data }.
export function useFetch(request, deps = [], { enabled = true } = {}) {
  const { data: raw, isFetching, error, refetch } = useQuery({
    // Build a stable query key from the deps array.
    queryKey: ['useFetch', ...deps],
    queryFn: request,
    enabled,
  });

  return {
    data: raw?.data ?? null,
    meta: raw?.meta ?? null,
    loading: isFetching,
    error: error ? apiErrorMessage(error) : null,
    reload: refetch,
  };
}
