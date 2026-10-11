import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuUsers, LuCalendar, LuDollarSign, LuTicket, LuTrendingUp, LuTrendingDown } from 'react-icons/lu';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardCharts, useDashboardSummary } from '../../hooks/queries/dashboard.queries';
import EventDetailModal from '../../components/feature/EventDetailModal';
import ErrorState from '../../components/ui/ErrorState';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import DataCard, { DataCardBody } from '../../components/ui/DataCard';
import Badge from '../../components/ui/Badge';
import ChartSkeleton from '../../components/ui/skeletons/ChartSkeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

// Chart color constants — pulled from CSS variables for consistency
const CHART_INCOME = '#16a34a';
const CHART_EXPENSE = '#dc2626';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cf-divider bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-cf-fg mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-cf-muted">{p.name}:</span>
          <span className="font-medium text-cf-fg">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function MonthlyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-60 text-cf-muted text-sm">
        No transaction data yet for the chart.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_INCOME} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_INCOME} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_EXPENSE} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_EXPENSE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 100 / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#52525b' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value) => <span className="text-cf-muted">{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke={CHART_INCOME}
          strokeWidth={2.5}
          fill="url(#incomeGrad)"
          name="Income"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke={CHART_EXPENSE}
          strokeWidth={2.5}
          fill="url(#expenseGrad)"
          name="Expense"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CategoryBarChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-cf-muted text-sm">
        No category data yet.
      </div>
    );
  }
  // Group into income vs expense per category
  const grouped = {};
  for (const row of data) {
    if (!grouped[row.category]) grouped[row.category] = { category: row.category, income: 0, expense: 0 };
    if (row.type === 'INCOME') grouped[row.category].income += row.amount;
    else grouped[row.category].expense += row.amount;
  }
  const chartData = Object.values(grouped).sort((a, b) => (b.income + b.expense) - (a.income + a.expense)).slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 100 / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: '#52525b' }}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill={CHART_INCOME} radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="expense" name="Expense" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatsSection() {
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const { data: raw, isLoading, error, refetch } = useDashboardSummary();
  const d = raw?.data;

  if (error) return <ErrorState error={error.message} onRetry={refetch} />;

  const balance = d?.finance?.balance ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total members" value={d?.members?.total ?? 0} icon={LuUsers} loading={isLoading} />
        <StatCard label="Active members" value={d?.members?.active ?? 0} icon={LuUsers} tone="success" loading={isLoading} />
        <StatCard label="Tickets sold" value={d?.ticketsSold ?? 0} icon={LuTicket} loading={isLoading} />
        <StatCard
          label="Balance"
          value={formatCurrency(balance)}
          icon={balance >= 0 ? LuTrendingUp : LuTrendingDown}
          tone={balance >= 0 ? 'success' : 'danger'}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Upcoming events */}
        <DataCard
          title="Upcoming events"
          action={
            <Link to="/admin/events" className="text-xs font-semibold text-cf-fg hover:underline">
              View events
            </Link>
          }
        >
          {(!d?.upcomingEvents?.length) ? (
            <DataCardBody><p className="text-xs text-cf-muted">No upcoming events.</p></DataCardBody>
          ) : (
            <ul className="divide-y divide-cf-divider">
              {d.upcomingEvents.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedEventModal(e)}
                    className="w-full text-left flex items-center justify-between px-6 py-3 gap-3 hover:bg-cf-subtle/70 transition-colors cursor-pointer group"
                    title="Click to view attendee list & fill rate"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-cf-fg truncate group-hover:underline transition-colors">
                        {e.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-cf-muted mt-0.5">
                        <span>{formatDate(e.startAt)}</span>
                        <span>•</span>
                        <span className="font-medium text-cf-fg">{e.bookedCount ?? 0} / {e.capacity} registered</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone={e.seatsRemaining > 5 ? 'green' : e.seatsRemaining > 0 ? 'amber' : 'red'}>
                        {e.seatsRemaining} left
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DataCard>

        {/* Modal for viewing event details, capacity fill, and person names */}
        {selectedEventModal && (
          <EventDetailModal
            event={selectedEventModal}
            open={Boolean(selectedEventModal)}
            onClose={() => setSelectedEventModal(null)}
          />
        )}

        {/* Expiring memberships */}
        <DataCard
          title="Expiring soon"
          action={
            <Link to="/admin/members" className="text-xs font-semibold text-cf-fg hover:underline">
              View members
            </Link>
          }
        >
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
        <DataCard
          title="Recent registrations"
          action={
            <Link to="/admin/events" className="text-xs font-semibold text-cf-fg hover:underline">
              View bookings
            </Link>
          }
        >
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
        <DataCard
          title="Low stock alert"
          action={
            <Link to="/admin/merchandise" className="text-xs font-semibold text-cf-fg hover:underline">
              View inventory
            </Link>
          }
        >
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
  if (error) return <ErrorState error={`Charts unavailable: ${error.message}`} onRetry={refetch} title="Charts unavailable" />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
      <DataCard title="Income vs Expense — last 6 months" className="min-w-0">
        <DataCardBody>
          <MonthlyChart data={d?.monthly ?? []} />
        </DataCardBody>
      </DataCard>
      <DataCard title="Spending by category" className="min-w-0">
        <DataCardBody>
          <CategoryBarChart data={d?.byCategory ?? []} />
        </DataCardBody>
      </DataCard>
    </div>
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
