import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuArrowLeft, LuCircleCheck, LuDollarSign, LuSearch, LuTag, LuUserX } from 'react-icons/lu';
import { eventsApi } from '../../api/events.api';
import Badge from '../../components/ui/Badge';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { SkeletonStats } from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function EventBookings() {
  const { id } = useParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [checkedIn, setCheckedIn] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const event = useFetch(() => eventsApi.get(id), [id]);
  const stats = useFetch(() => eventsApi.stats(id), [id]);
  const bookings = useFetch(
    () =>
      eventsApi.bookings(id, {
        q: q || undefined,
        status: status || undefined,
        checkedIn: checkedIn || undefined,
        page,
        pageSize: 15,
      }),
    [id, q, status, checkedIn, page],
  );

  const s = stats.data;
  const columns = [
    {
      key: 'attendee',
      header: 'Attendee',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.user?.name}</p>
          <p className="text-xs text-slate-500">{row.user?.email}</p>
        </div>
      ),
    },
    { key: 'createdAt', header: 'Booked', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'price',
      header: 'Price',
      className: 'tabular-nums',
      render: (row) => (
        <span>
          {formatCurrency(row.priceAtBooking)} {row.isMemberPrice && <Badge tone="blue" className="ml-1">Member</Badge>}
        </span>
      ),
    },
    { key: 'status', header: 'Booking', render: (row) => <Badge status={row.status} /> },
    { key: 'paymentStatus', header: 'Payment', render: (row) => <Badge status={row.paymentStatus} /> },
    {
      key: 'checkedIn',
      header: 'Checked in',
      render: (row) => {
        const at = row.checkedInAt ?? row.ticket?.checkIn?.checkedInAt;
        return at ? <span className="text-emerald-700">{formatDateTime(at)}</span> : <span className="text-slate-400">No</span>;
      },
    },
  ];

  return (
    <>
      <Link to="/admin/events" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <LuArrowLeft aria-hidden="true" /> All events
      </Link>
      <PageHeader
        title={event.data?.title ?? 'Event bookings'}
        subtitle={event.data ? `${formatDateTime(event.data.startAt)} at ${event.data.venue}` : undefined}
        actions={event.data && <Badge status={event.data.status} />}
      />

      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}
      {stats.loading && !s && <SkeletonStats count={4} />}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Registrations" value={`${s.registrations} / ${s.capacity}`} hint={`${s.seatsRemaining} seats remaining`} icon={LuTag} />
          <StatCard label="Checked in" value={s.checkIns} hint={s.attendanceRate != null ? `${Math.round(s.attendanceRate * 100)}% attendance` : 'Event not finished'} icon={LuCircleCheck} tone="green" />
          <StatCard label="No-shows" value={s.noShows ?? '-'} hint={s.noShows == null ? 'Known after the event' : undefined} icon={LuUserX} tone="amber" />
          <StatCard label="Net result" value={formatCurrency(s.net)} hint={`${formatCurrency(s.revenue)} revenue, ${formatCurrency(s.expenses)} costs`} icon={LuDollarSign} tone={s.net >= 0 ? 'primary' : 'red'} />
        </div>
      )}

      <Card className="mt-6" title="Bookings" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input aria-label="Search attendees" className="[&_input]:pl-9" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select
            aria-label="filter by booking status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            placeholder="All bookings"
            options={[{ value: 'CONFIRMED', label: 'Confirmed' }, { value: 'CANCELLED', label: 'Cancelled' }]}
          />
          <Select
            aria-label="filter by check-in"
            value={checkedIn}
            onChange={(e) => { setCheckedIn(e.target.value); setPage(1); }}
            placeholder="Any check-in state"
            options={[{ value: 'true', label: 'Checked in' }, { value: 'false', label: 'Not checked in' }]}
          />
        </div>
        {bookings.error ? (
          <ErrorState message={bookings.error} onRetry={bookings.reload} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={bookings.data}
              loading={bookings.loading}
              emptyIcon={LuTag}
              emptyTitle="No bookings found"
              emptyMessage="Bookings for this event will appear here."
            />
            <Pagination meta={bookings.meta} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
