import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import { preloadRoute } from '../routes/routeConfig';
import { dashboardKeys } from './queries/dashboard.queries';

const MIN_LOADER_MS = 600; // the loading screen never flashes by, but it no longer holds the user back
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Controls what happens between a successful sign-in and the dashboard:
//   begin()  - call before signing in; stops the page from redirecting on its own the moment the user object appears
//   finish() - shows the "signing you in" screen, loads the destination page's code, then navigates there
//   cancel() - call if signing in failed
// The destination is always explicit, so a finished login can only ever end on the dashboard (or the page the user asked for).
export function usePostLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transition, setTransition] = useState(null);
  const active = useRef(false);

  return {
    transition,
    active,
    begin: () => {
      active.current = true;
    },
    cancel: () => {
      active.current = false;
      setTransition(null);
    },
    finish: async (account, target) => {
      setTransition({ name: account.name, role: account.role });
      // The dashboard's data is requested now, in parallel with the loading screen and the page code, so it is usually
      // already in the cache when the dashboard opens. Errors are ignored here: the dashboard retries on its own.
      const warm = [];
      if (target.split('?')[0] === '/admin') {
        warm.push(
          queryClient.prefetchQuery({ queryKey: dashboardKeys.summary(), queryFn: () => dashboardApi.summary(), staleTime: 30 * 1000 }),
          queryClient.prefetchQuery({ queryKey: dashboardKeys.charts(), queryFn: () => dashboardApi.charts(), staleTime: 60 * 1000 }),
        );
      }
      await Promise.all([preloadRoute(target.split('?')[0]), sleep(MIN_LOADER_MS), ...warm.map((p) => p.catch(() => {}))]);
      navigate(target, { replace: true });
    },
  };
}
