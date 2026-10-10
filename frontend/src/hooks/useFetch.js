import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '../api/axiosInstance';

// Thin wrapper over useQuery so existing imports do not break.
// request() must return { data, meta } or { data }.
export function useFetch(request, deps = [], { enabled = true, key } = {}) {
  // Disambiguate query key by caller function string or explicit key to prevent collisions when deps are identical
  const queryFnKey = key || (typeof request === 'function' ? request.toString().replace(/\s+/g, ' ') : 'default');

  const { data: raw, isFetching, error, refetch } = useQuery({
    queryKey: ['useFetch', queryFnKey, ...deps],
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
