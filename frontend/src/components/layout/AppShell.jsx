import { useIsFetching } from '@tanstack/react-query';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TopProgressBar from '../ui/TopProgressBar';

// Layout: full-width header on top, fixed sidebar on the left, scrolling content.
export default function AppShell({ children }) {
  // TopProgressBar fires whenever any React Query fetch is in flight.
  const fetching = useIsFetching();

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
