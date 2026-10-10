import { useState } from 'react';
import { LuBell } from 'react-icons/lu';
import { announcementsApi } from '../../api/announcements.api';
import AnnouncementCard from '../../components/feature/AnnouncementCard';
import PublicNavbar from '../../components/layout/PublicNavbar';
import { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';

export default function Announcements() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch(
    () => announcementsApi.list({ page, pageSize: 10 }),
    [page, user?.id],
  );

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader title="Announcements" subtitle="Pinned posts come first, then the newest." />
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-32 w-full" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && (
          <EmptyState icon={LuBell} title="No announcements yet" message="New posts from the committee will appear here." />
        )}
        {!loading && data?.length > 0 && (
          <>
            <div className="space-y-4">
              {data.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white">
              <Pagination meta={meta} onPage={setPage} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
