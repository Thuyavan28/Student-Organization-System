import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { preloadRoute } from '../routes/routeConfig';

const MIN_LOADER_MS = 1100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Controls what happens between a successful sign-in and the dashboard:
//   begin()  - call before signing in; stops the page from redirecting on its own the moment the user object appears
//   finish() - shows the "signing you in" screen, loads the destination page's code, then navigates there
//   cancel() - call if signing in failed
// The destination is always explicit, so a finished login can only ever end on the dashboard (or the page the user asked for).
export function usePostLogin() {
  const navigate = useNavigate();
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
      await Promise.all([preloadRoute(target.split('?')[0]), sleep(MIN_LOADER_MS)]);
      navigate(target, { replace: true });
    },
  };
}
