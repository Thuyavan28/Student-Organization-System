import { useMemo, useState } from 'react';
import { FiDownload, FiPlus, FiPieChart, FiTrendingDown, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { eventsApi } from '../../api/events.api';
import { financeApi } from '../../api/finance.api';
import { fundraisersApi } from '../../api/fundraisers.api';
import { transactionsApi } from '../../api/transactions.api';
import CategoryBreakdownChart from '../../components/feature/CategoryBreakdownChart';
import IncomeExpenseChart, { EXPENSE_COLOR, INCOME_COLOR } from '../../components/feature/IncomeExpenseChart';
import LedgerTable from '../../components/feature/LedgerTable';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { SkeletonStats } from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { TXN_CATEGORIES, TXN_TYPES, humanize } from '../../utils/constants';
import { formatCurrency, toPaise } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const MONTHS_SHOWN = 12;
const EMPTY_FILTERS = { type: '', category: '', eventId: '', fundraiserId: '', from: '', to: '', q: '' };

function ManualEntryForm({ events, fundraisers, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    type: 'INCOME', category: 'DONATION', amount: '', description: '', eventId: '', fundraiserId: '',
    occurredAt: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (toPaise(form.amount) <= 0) found.amount = 'Enter an amount greater than zero';
    if (form.description.trim().length < 3) found.description = 'Describe the entry';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await transactionsApi.create({
        type: form.type,
        category: form.category,
        amount: toPaise(form.amount),
        description: form.description.trim(),
        occurredAt: new Date(form.occurredAt).toISOString(),
        eventId: form.eventId ? Number(form.eventId) : undefined,
        fundraiserId: form.fundraiserId ? Number(form.fundraiserId) : undefined,
      });
      toast.success('Ledger entry recorded');
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Record ledger entry"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="ledger-form" loading={saving}>Record entry</Button>
        </>
      }
    >
      <form id="ledger-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Select label="Type" value={form.type} onChange={set('type')} options={TXN_TYPES.map((value) => ({ value, label: humanize(value) }))} />
        <Select label="Category" value={form.category} onChange={set('category')} options={TXN_CATEGORIES.map((value) => ({ value, label: humanize(value) }))} />
        <Input label="Amount (Rs)" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount} />
        <Input label="Date" type="date" value={form.occurredAt} onChange={set('occurredAt')} error={errors.occurredAt} />
        <Input className="sm:col-span-2" label="Description" value={form.description} onChange={set('description')} error={errors.description} />
        <Select label="Event (optional)" value={form.eventId} onChange={set('eventId')} placeholder="None" options={(events ?? []).map((item) => ({ value: item.id, label: item.title }))} />
        <Select label="Fundraiser (optional)" value={form.fundraiserId} onChange={set('fundraiserId')} placeholder="None" options={(fundraisers ?? []).map((item) => ({ value: item.id, label: item.title }))} />
      </form>
    </Modal>
  );
}

function categoryData(rows, type) {
  return rows
    .filter((row) => row.type === type)
    .map((row) => ({ name: humanize(row.category), value: row.amount }))
    .sort((a, b) => b.value - a.value);
}

export default function Finance() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ key: 'occurredAt', order: 'desc' });
  const [page, setPage] = useState(1);
  const [entryOpen, setEntryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = useDebounce(filters.q);

  const params = useMemo(
    () => ({
      type: filters.type || undefined,
      category: filters.category || undefined,
      eventId: filters.eventId || undefined,
      fundraiserId: filters.fundraiserId || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
      q: q || undefined,
    }),
    [filters.type, filters.category, filters.eventId, filters.fundraiserId, filters.from, filters.to, q],
  );
  const paramKey = JSON.stringify(params);

  const events = useFetch(() => eventsApi.list({ pageSize: 100 }), []);
  const fundraisers = useFetch(() => fundraisersApi.list({ pageSize: 100 }), []);
  const summary = useFetch(() => financeApi.summary({ from: params.from, to: params.to }), [params.from, params.to]);
  const ledger = useFetch(
    () => transactionsApi.list({ ...params, sort: sort.key, order: sort.order, page, pageSize: 15 }),
    [paramKey, sort.key, sort.order, page],
  );
  const report = useFetch(() => financeApi.eventReport(), []);

  const setFilter = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
    setPage(1);
  };

  const toggleSort = (key) => {
    setSort((current) => ({ key, order: current.key === key && current.order === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await financeApi.exportCsv(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clubflow-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const s = summary.data;
  const sumOf = (category) => (s?.byCategory ?? []).filter((row) => row.category === category && row.type === 'INCOME').reduce((total, row) => total + row.amount, 0);
  const reportRows = (report.data ?? []).filter((row) => row.registrations > 0 || row.revenue > 0);

  const reportColumns = [
    { key: 'title', header: 'Event', render: (row) => <span className="font-medium text-slate-900">{row.title}</span> },
    { key: 'startAt', header: 'Date', render: (row) => formatDate(row.startAt) },
    { key: 'registrations', header: 'Registered', className: 'tabular-nums' },
    { key: 'checkIns', header: 'Attended', className: 'tabular-nums' },
    { key: 'attendanceRate', header: 'Attendance', className: 'tabular-nums', render: (row) => (row.attendanceRate == null ? '-' : `${Math.round(row.attendanceRate * 100)}%`) },
    { key: 'revenue', header: 'Revenue', className: 'tabular-nums', render: (row) => formatCurrency(row.revenue) },
    { key: 'expenses', header: 'Costs', className: 'tabular-nums', render: (row) => formatCurrency(row.expenses) },
    { key: 'net', header: 'Net', className: 'tabular-nums font-medium', render: (row) => formatCurrency(row.net) },
  ];

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Every figure on this page is computed from the ledger."
        actions={
          <>
            <Button variant="secondary" icon={FiDownload} loading={exporting} onClick={exportCsv}>Export CSV</Button>
            <Button icon={FiPlus} onClick={() => setEntryOpen(true)}>Record entry</Button>
          </>
        }
      />

      <Card className="mb-6" title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Type" value={filters.type} onChange={setFilter('type')} placeholder="Income and expense" options={TXN_TYPES.map((value) => ({ value, label: humanize(value) }))} />
          <Select aria-label="Category" value={filters.category} onChange={setFilter('category')} placeholder="All categories" options={TXN_CATEGORIES.map((value) => ({ value, label: humanize(value) }))} />
          <Select aria-label="Event" value={filters.eventId} onChange={setFilter('eventId')} placeholder="All events" options={(events.data ?? []).map((item) => ({ value: item.id, label: item.title }))} />
          <Select aria-label="Fundraiser" value={filters.fundraiserId} onChange={setFilter('fundraiserId')} placeholder="All fundraisers" options={(fundraisers.data ?? []).map((item) => ({ value: item.id, label: item.title }))} />
          <Input aria-label="From date" type="date" value={filters.from} onChange={setFilter('from')} />
          <Input aria-label="To date" type="date" value={filters.to} onChange={setFilter('to')} />
          <Input aria-label="Search description" className="lg:col-span-1" placeholder="Search description" value={filters.q} onChange={setFilter('q')} />
          <Button variant="ghost" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Clear filters</Button>
        </div>
      </Card>

      {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
      {summary.loading && !s && <SkeletonStats count={4} />}
      {s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Income" value={formatCurrency(s.income)} icon={FiTrendingUp} tone="green" />
            <StatCard label="Expenses" value={formatCurrency(s.expense)} icon={FiTrendingDown} tone="red" />
            <StatCard label="Balance left" value={formatCurrency(s.net)} icon={FiPieChart} tone={s.net >= 0 ? 'primary' : 'red'} />
            <StatCard label="Dues collected" value={formatCurrency(sumOf('DUES'))} icon={FiUsers} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Tickets" value={formatCurrency(sumOf('TICKETS'))} />
            <StatCard label="Merchandise" value={formatCurrency(sumOf('MERCHANDISE'))} />
            <StatCard label="Fundraiser income" value={formatCurrency(sumOf('FUNDRAISER'))} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card title="Income and expense by month">
              <IncomeExpenseChart data={(s.byMonth ?? []).slice(-MONTHS_SHOWN)} />
            </Card>
            <div className="space-y-6">
              <Card title="Income by category">
                <CategoryBreakdownChart label="Income by category" data={categoryData(s.byCategory ?? [], 'INCOME')} color={INCOME_COLOR} />
              </Card>
              <Card title="Expenses by category">
                <CategoryBreakdownChart label="Expenses by category" data={categoryData(s.byCategory ?? [], 'EXPENSE')} color={EXPENSE_COLOR} />
              </Card>
            </div>
          </div>
        </>
      )}

      <Card className="mt-6" title="Ledger" subtitle="Filtered by the controls above" padded={false}>
        {ledger.error ? (
          <ErrorState message={ledger.error} onRetry={ledger.reload} />
        ) : (
          <LedgerTable rows={ledger.data} meta={ledger.meta} loading={ledger.loading} sort={sort} onSort={toggleSort} onPage={setPage} />
        )}
      </Card>

      <Card className="mt-6" title="Per-event report" subtitle="Registrations versus attendance, and what each event made" padded={false}>
        {report.error ? (
          <ErrorState message={report.error} onRetry={report.reload} />
        ) : (
          <>
            <Table columns={reportColumns} rows={reportRows} loading={report.loading} rowKey="eventId" emptyTitle="No event data yet" />
            {reportRows.length > 0 && (
              <div className="grid gap-6 border-t border-slate-100 p-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Revenue by event</h3>
                  <CategoryBreakdownChart label="Revenue by event" data={reportRows.map((row) => ({ name: row.title, value: row.revenue }))} color={INCOME_COLOR} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Attendance rate by event</h3>
                  <CategoryBreakdownChart
                    label="Attendance rate by event"
                    data={reportRows.filter((row) => row.attendanceRate != null).map((row) => ({ name: row.title, value: Math.round(row.attendanceRate * 100) }))}
                    color={INCOME_COLOR}
                    formatValue={(value) => `${value}%`}
                    formatTick={(value) => `${value}%`}
                    emptyMessage="Attendance appears once an event has finished."
                  />
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {entryOpen && (
        <ManualEntryForm
          events={events.data}
          fundraisers={fundraisers.data}
          onClose={() => setEntryOpen(false)}
          onSaved={() => { setEntryOpen(false); ledger.reload(); summary.reload(); report.reload(); }}
        />
      )}
    </>
  );
}
