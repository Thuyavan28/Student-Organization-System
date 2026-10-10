import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/axiosInstance';

// Runs `request` (which resolves to { data, meta }) whenever `deps` change.
// Responses that arrive after a newer request started are ignored.
export function useFetch(request, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const latest = useRef(0);
  const requestRef = useRef(request);
  requestRef.current = request;

  const run = useCallback(async () => {
    const id = ++latest.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const body = await requestRef.current();
      if (id === latest.current) {
        setState({ data: body?.data ?? null, meta: body?.meta ?? null, loading: false, error: null });
      }
    } catch (error) {
      if (id === latest.current) {
        setState((current) => ({ ...current, loading: false, error: apiErrorMessage(error) }));
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    else setState((current) => ({ ...current, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { ...state, reload: run };
}
