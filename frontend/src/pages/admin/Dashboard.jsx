import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiCalendar, FiClipboard, FiDollarSign, FiTag, FiTrendingDown, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { dashboardApi } from '../../api/dashboard.api';
import IncomeExpenseChart from '../../components/feature/IncomeExpenseChart';
import Badge from '../../components/ui/Badge';
import Card, { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonStats } from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import { useFetch } from '../../hooks/useFetch';
import { formatCurrency } from '../../utils/formatCurrency';
import { daysUntil, formatDate, formatDateTime } from '../../utils/formatDate';

function MiniList({ items, empty, render }) {
  if (!items?.length) return <p className="py-4 text-center text-sm text-slate-500">{empty}</p>;
  return <ul className="divide-y divide-slate-100 text-sm">{items.map(render)}</ul>;
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => dashboardApi.summary(), []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <SkeletonStats count={8} />
      </>
    );
  }

  const { members, finance, openTasks } = data;
  const openTaskCount = (openTasks?.PENDING ?? 0) + (openTasks?.IN_PROGRESS ?? 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live numbers from the club database." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={members.total} hint={`${members.active} active`} icon={FiUsers} />
        <StatCard
          label="Expiring within 30 days"
          value={members.expiringSoon}
          icon={FiAlertTriangle}
          tone={members.expiringSoon > 0 ? 'amber' : 'green'}
        />
        <StatCard label="Tickets sold" value={data.ticketsSold} icon={FiTag} />
        <StatCard label="Open tasks" value={openTaskCount} hint={`${openTasks?.IN_PROGRESS ?? 0} in progress`} icon={FiClipboard} />
        <StatCard label="Income" value={formatCurrency(finance.income)} icon={FiTrendingUp} tone="green" />
        <StatCard label="Expenses" value={formatCurrency(finance.expense)} icon={FiTrendingDown} tone="red" />
        <StatCard label="Balance" value={formatCurrency(finance.balance)} icon={FiDollarSign} tone={finance.balance >= 0 ? 'primary' : 'red'} />
        <StatCard label="Upcoming events" value={data.upcomingEvents?.length ?? 0} icon={FiCalendar} />
      </div>

      <Card className="mt-6" title="Income and expense by month" subtitle="Last months from the ledger">
        <IncomeExpenseChart data={data.monthly} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming events" actions={<Link className="text-sm font-medium text-primary-700 hover:underline" to="/admin/events">Manage</Link>}>
          <MiniList
            items={data.upcomingEvents}
            empty="No upcoming events."
            render={(event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <Link className="font-medium text-slate-900 hover:text-primary-700" to={`/admin/events/${event.id}/bookings`}>{event.title}</Link>
                  <p className="text-xs text-slate-500">{formatDateTime(event.startAt)}</p>
                </div>
                <Badge tone={event.seatsRemaining <= 5 ? 'amber' : 'blue'}>
                  {event.bookedCount ?? event.capacity - event.seatsRemaining} / {event.capacity}
                </Badge>
              </li>
            )}
          />
        </Card>

        <Card title="Expiring memberships" actions={<Link className="text-sm font-medium text-primary-700 hover:underline" to="/admin/members">View all</Link>}>
          <MiniList
            items={data.expiringMembers}
            empty="No memberships are expiring soon."
            render={(member) => {
              const days = daysUntil(member.expiresAt);
              return (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-slate-900">{member.user?.name ?? member.name}</p>
                    <p className="text-xs text-slate-500">Expires {formatDate(member.expiresAt)}</p>
                  </div>
                  <Badge tone={days <= 7 ? 'red' : 'amber'}>{days} days</Badge>
                </li>
              );
            }}
          />
        </Card>

        <Card title="Recent registrations">
          <MiniList
            items={data.recentRegistrations}
            empty="No recent registrations."
            render={(item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium text-slate-900">{item.user?.name ?? item.name}</p>
                  <p className="text-xs text-slate-500">{item.event?.title ?? item.studentId ?? item.user?.email}</p>
                </div>
                <span className="text-xs text-slate-500">{formatDate(item.createdAt ?? item.joinedAt)}</span>
              </li>
            )}
          />
        </Card>

        <Card title="Low stock" actions={<Link className="text-sm font-medium text-primary-700 hover:underline" to="/admin/merchandise">Restock</Link>}>
          <MiniList
            items={data.lowStock}
            empty="All variants are well stocked."
            render={(variant) => (
              <li key={variant.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium text-slate-900">
                  {variant.product?.name ?? variant.productName} ({variant.size === 'ONE_SIZE' ? 'One size' : variant.size})
                </span>
                <Badge tone={variant.stock === 0 ? 'red' : 'amber'}>{variant.stock === 0 ? 'Out of stock' : `${variant.stock} left`}</Badge>
              </li>
            )}
          />
        </Card>
      </div>

      {!data.upcomingEvents?.length && !data.monthly?.length && (
        <EmptyState icon={FiCalendar} title="Nothing to show yet" message="Create an event or record income to see activity here." />
      )}
    </>
  );
}
