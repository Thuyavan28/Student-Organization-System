import { useState } from 'react';
import { LuCalendar, LuSearch } from 'react-icons/lu';
import { eventsApi } from '../../api/events.api';
import EventCard from '../../components/feature/EventCard';
import PublicNavbar from '../../components/layout/PublicNavbar';
import { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function Events() {
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data, meta, loading, error, reload } = useFetch(
    () =>
      eventsApi.list({
        q: q || undefined,
        upcoming: tab === 'upcoming' ? true : undefined,
        status: tab === 'past' ? 'COMPLETED' : undefined,
        page,
        pageSize: 9,
      }),
    [tab, q, page],
  );

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader title="Events" subtitle="Member prices apply automatically when you are logged in with an active membership." />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => { setTab(item.value); setPage(1); }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === item.value ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              aria-label="Search events"
              className="[&_input]:pl-9"
              placeholder="Search events"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading && <SkeletonCards count={6} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && (
          <EmptyState icon={LuCalendar} title="No events found" message="Try a different search or tab." />
        )}
        {!loading && data?.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((event) => (
                <EventCard key={event.id} event={event} />
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
