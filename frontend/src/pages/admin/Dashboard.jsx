import { Suspense } from 'react';
import { LuUsers, LuCalendar, LuDollarSign, LuTicket } from 'react-icons/lu';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useDashboardCharts, useDashboardSummary } from '../../hooks/queries/dashboard.queries';
import ErrorState from '../../components/ui/ErrorState';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import DataCard, { DataCardBody } from '../../components/ui/DataCard';
import Badge from '../../components/ui/Badge';
import StatCardSkeleton from '../../components/ui/skeletons/StatCardSkeleton';
import ChartSkeleton from '../../components/ui/skeletons/ChartSkeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

function MonthlyChart({ data = [] }) {
  const fmt = (v) => `Rs ${(v / 100).toLocaleString()}`;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#09090b" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#09090b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => `${(v / 100 / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} width={36} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }} />
        <Area type="monotone" dataKey="income" stroke="#09090b" strokeWidth={2} fill="url(#incomeGrad)" name="Income" dot={false} />
        <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatsSection() {
  const { data: raw, isLoading, error, refetch } = useDashboardSummary();
  const d = raw?.data;

  if (isLoading) return <StatCardSkeleton count={4} />;
  if (error) return <ErrorState error={error.message} onRetry={refetch} />;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total members" value={d?.members?.total} icon={LuUsers} />
        <StatCard label="Active members" value={d?.members?.active} icon={LuUsers} tone="success" />
        <StatCard label="Tickets sold" value={d?.ticketsSold} icon={LuTicket} />
        <StatCard label="Balance" value={formatCurrency(d?.finance?.balance)} icon={LuDollarSign} tone={d?.finance?.balance >= 0 ? 'success' : 'danger'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Upcoming events */}
        <DataCard title="Upcoming events">
          {(!d?.upcomingEvents?.length) ? (
            <DataCardBody><p className="text-xs text-cf-muted">No upcoming events.</p></DataCardBody>
          ) : (
            <ul className="divide-y divide-cf-divider">
              {d.upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <div>
                    <p className="text-sm font-medium text-cf-fg truncate">{e.title}</p>
                    <p className="text-xs text-cf-muted">{formatDate(e.startAt)}</p>
                  </div>
                  <span className="text-xs text-cf-muted shrink-0">
                    {e.seatsRemaining} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DataCard>

        {/* Expiring memberships */}
        <DataCard title="Expiring soon">
          {(!d?.expiringMembers?.length) ? (
            <DataCardBody><p className="text-xs text-cf-muted">No memberships expiring in 30 days.</p></DataCardBody>
          ) : (
            <ul className="divide-y divide-cf-divider">
              {d.expiringMembers.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <p className="text-sm font-medium text-cf-fg">{m.user?.name}</p>
                  <span className="text-xs text-cf-muted shrink-0">{formatDate(m.expiresAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </DataCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent registrations */}
        <DataCard title="Recent registrations">
          {(!d?.recentRegistrations?.length) ? (
            <DataCardBody><p className="text-xs text-cf-muted">No recent registrations.</p></DataCardBody>
          ) : (
            <ul className="divide-y divide-cf-divider">
              {d.recentRegistrations.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <p className="text-sm font-medium text-cf-fg">{b.user?.name}</p>
                  <p className="text-xs text-cf-muted truncate">{b.event?.title}</p>
                </li>
              ))}
            </ul>
          )}
        </DataCard>

        {/* Low stock */}
        <DataCard title="Low stock">
          {(!d?.lowStock?.length) ? (
            <DataCardBody><p className="text-xs text-cf-muted">All products are well stocked.</p></DataCardBody>
          ) : (
            <ul className="divide-y divide-cf-divider">
              {d.lowStock.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <p className="text-sm font-medium text-cf-fg">{v.product?.name} - {v.size}</p>
                  <Badge tone={v.stock === 0 ? 'red' : 'amber'}>{v.stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </DataCard>
      </div>
    </>
  );
}

function ChartsSection() {
  const { data: raw, isLoading, error, refetch } = useDashboardCharts();
  const d = raw?.data;

  if (isLoading) return <ChartSkeleton height={300} />;
  if (error) return <ErrorState error={error.message} onRetry={refetch} title="Charts unavailable" />;

  return (
    <DataCard title="Income vs Expense (last 6 months)" className="mt-6">
      <DataCardBody>
        <MonthlyChart data={d?.monthly} />
      </DataCardBody>
    </DataCard>
  );
}

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your club's performance"
      />
      <StatsSection />
      {/* Charts load independently so stat cards are never blocked by heavy aggregates */}
      <Suspense fallback={<ChartSkeleton height={300} />}>
        <ChartsSection />
      </Suspense>
    </div>
  );
}
