import { useIsFetching } from '@tanstack/react-query';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TopProgressBar from '../ui/TopProgressBar';

export default function AppShell({ children }) {
  // TopProgressBar fires whenever any React Query fetch is in flight.
  const fetching = useIsFetching();

  return (
    <div className="flex min-h-screen bg-cf-subtle">
      <TopProgressBar loading={fetching > 0} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
