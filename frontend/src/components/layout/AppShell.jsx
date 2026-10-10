import { useEffect } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { preloadRoute } from '../../routes/routeConfig';
import { navItemsFor } from '../../utils/constants';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TopProgressBar from '../ui/TopProgressBar';

// Layout: full-width header on top, fixed sidebar on the left, scrolling content.
export default function AppShell({ children }) {
  // TopProgressBar fires whenever any React Query fetch is in flight.
  const fetching = useIsFetching();
  const { user } = useAuth();

  // Once the page has settled, quietly fetch the code for every menu page so each click opens instantly.
  useEffect(() => {
    const paths = navItemsFor(user?.role).map((item) => item.to);
    const run = () => paths.forEach(preloadRoute);
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(run, 1500);
    return () => clearTimeout(timer);
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-white">
      <TopProgressBar loading={fetching > 0} />
      <Topbar />
      <div className="flex items-start">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
