import { useState } from 'react';
import { LuDownload, LuDollarSign, LuPlus, LuSearch, LuTrendingUp, LuTrendingDown } from 'react-icons/lu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { transactionsApi } from '../../api/transactions.api';
import { financeApi } from '../../api/finance.api';
import { useTransactionsList, useCreateTransaction } from '../../hooks/queries/transactions.queries';
import { useFinanceSummary } from '../../hooks/queries/finance.queries';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataCard from '../../components/ui/DataCard';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterCard, { FilterField } from '../../components/ui/FilterCard';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import StatCardSkeleton from '../../components/ui/skeletons/StatCardSkeleton';
import TableSkeleton from '../../components/ui/skeletons/TableSkeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { TXN_TYPES, TXN_CATEGORIES, humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

function AddTransactionModal({ onClose, onSaved }) {
  const toast = useToast();
  const { user } = useAuth();
  const { mutateAsync, isPending } = useCreateTransaction();
  const [form, setForm] = useState({ type: 'INCOME', category: 'OTHER', amount: '', description: '', occurredAt: new Date().toISOString().slice(0, 10) });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((c) => ({ ...c, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) found.amount = 'Enter a valid amount';
    if (!form.description.trim()) found.description = 'Enter a description';
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await mutateAsync({ ...form, amount: Math.round(Number(form.amount) * 100), occurredAt: new Date(form.occurredAt) });
      toast.success('Transaction recorded');
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to save');
    }
  };

  return (
    <Modal open onClose={onClose} title="Record transaction" size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Select id="txn-type" label="Type" value={form.type} onChange={set('type')}>
          {TXN_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </Select>
        <Select id="txn-cat" label="Category" value={form.category} onChange={set('category')}>
          {TXN_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </Select>
        <Input id="txn-amt" label="Amount (Rs)" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount} placeholder="0.00" />
        <Input id="txn-desc" label="Description" value={form.description} onChange={set('description')} error={errors.description} />
        <Input id="txn-date" label="Date" type="date" value={form.occurredAt} onChange={set('occurredAt')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={isPending}>Record</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Finance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('ledger');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dq = useDebounce(q, 350);
  const toast = useToast();

  const params = { q: dq || undefined, type: type || undefined, category: category || undefined, page, limit: 20, sort: 'occurredAt', order: 'desc' };
  const { data: listData, isLoading, error, refetch } = useTransactionsList(params);
  const { data: summaryData, isLoading: sumLoading } = useFinanceSummary();

  const rows = listData?.data ?? [];
  const meta = listData?.meta ?? null;
  const summary = summaryData?.data;

  const isAdmin = ['ADMIN', 'TREASURER'].includes(user?.role);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await transactionsApi.exportCsv(params);
      const url = URL.createObjectURL(new Blob([res], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const TABS = [
    { id: 'ledger', label: 'Ledger' },
    { id: 'summary', label: 'Summary' },
  ];

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Income, expenses, and ledger"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={LuDownload} onClick={handleExport} loading={exporting}>
              Export CSV
            </Button>
            {isAdmin && (
              <Button size="sm" icon={LuPlus} onClick={() => setAddOpen(true)}>
                Record transaction
              </Button>
            )}
          </div>
        }
      />

      {/* Summary stat cards */}
      {sumLoading ? (
        <StatCardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
          <StatCard label="Total income" value={formatCurrency(summary?.income)} icon={LuTrendingUp} tone="success" />
          <StatCard label="Total expense" value={formatCurrency(summary?.expense)} icon={LuTrendingDown} tone="danger" />
          <StatCard label="Net balance" value={formatCurrency(summary?.net)} icon={LuDollarSign} tone={summary?.net >= 0 ? 'success' : 'danger'} />
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'ledger' && (
        <>
          <FilterCard className="mb-6">
            <FilterField label="Search" htmlFor="fin-q" className="flex-1 min-w-[200px]">
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-muted" />
                <input id="fin-q" className="input-base pl-9" placeholder="Description..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </div>
            </FilterField>
            <FilterField label="Type" htmlFor="fin-type">
              <Select id="fin-type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="w-36">
                <option value="">All types</option>
                {TXN_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
              </Select>
            </FilterField>
            <FilterField label="Category" htmlFor="fin-cat">
              <Select id="fin-cat" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-40">
                <option value="">All categories</option>
                {TXN_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
              </Select>
            </FilterField>
          </FilterCard>

          {isLoading ? (
            <TableSkeleton rows={10} cols={5} />
          ) : error ? (
            <ErrorState error={error.message} onRetry={refetch} />
          ) : rows.length === 0 ? (
            <EmptyState icon={LuDollarSign} title="No transactions" message="Try adjusting your filters." />
          ) : (
            <DataCard title={`${meta?.total ?? 0} transactions`}>
              <Table>
                <Thead>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th right>Amount</Th>
                </Thead>
                <Tbody>
                  {rows.map((t) => (
                    <Tr key={t.id}>
                      <Td muted>{formatDate(t.occurredAt)}</Td>
                      <Td><Badge status={t.type} /></Td>
                      <Td muted>{humanize(t.category)}</Td>
                      <Td>
                        <p className="text-sm text-cf-fg">{t.description}</p>
                        {t.event && <p className="text-xs text-cf-muted">{t.event.title}</p>}
                        {t.fundraiser && <p className="text-xs text-cf-muted">{t.fundraiser.title}</p>}
                      </Td>
                      <Td right>
                        <span className={`font-semibold tabular-nums ${t.type === 'INCOME' ? 'text-cf-success' : 'text-cf-accent'}`}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <Pagination meta={meta} onChange={setPage} />
            </DataCard>
          )}
        </>
      )}

      {tab === 'summary' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DataCard title="By category">
            {(!summary?.byCategory?.length) ? (
              <p className="p-6 text-xs text-cf-muted">No data.</p>
            ) : (
              <ul className="divide-y divide-cf-divider">
                {summary.byCategory.map((c) => (
                  <li key={`${c.type}-${c.category}`} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm text-cf-fg">{humanize(c.category)}</span>
                    <span className={`text-sm font-semibold tabular-nums ${c.type === 'INCOME' ? 'text-cf-success' : 'text-cf-accent'}`}>
                      {formatCurrency(c.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DataCard>
          <DataCard title="By event">
            {(!summary?.byEvent?.length) ? (
              <p className="p-6 text-xs text-cf-muted">No event transactions.</p>
            ) : (
              <ul className="divide-y divide-cf-divider">
                {summary.byEvent.map((e) => (
                  <li key={e.eventId} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm text-cf-fg">{e.title}</span>
                    <span className={`text-sm font-semibold tabular-nums ${e.net >= 0 ? 'text-cf-success' : 'text-cf-accent'}`}>
                      {formatCurrency(e.net)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DataCard>
        </div>
      )}

      {addOpen && <AddTransactionModal onClose={() => setAddOpen(false)} onSaved={() => setAddOpen(false)} />}
    </div>
  );
}
