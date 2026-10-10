import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LuCheck, LuFileText, LuPaperclip, LuSearch, LuX } from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { expensesApi } from '../../api/expenses.api';
import ReceiptPreview from '../../components/feature/ReceiptPreview';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function Expenses() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('SUBMITTED');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [reimburse, setReimburse] = useState(null);
  const [working, setWorking] = useState(false);
  const q = useDebounce(search);

  const { data, meta, loading, error, reload } = useFetch(
    () => expensesApi.list({ status: status || undefined, category: category || undefined, q: q || undefined, page, pageSize: 12 }),
    [status, category, q, page],
  );

  const submitReview = async () => {
    setWorking(true);
    try {
      await expensesApi.review(review.expense.id, { decision: review.decision, note: note.trim() || undefined });
      toast.success(review.decision === 'APPROVED' ? 'Claim approved — balance deducted' : 'Claim rejected');
      setReview(null);
      setNote('');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['useFetch'] });
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const submitReimburse = async () => {
    setWorking(true);
    try {
      await expensesApi.reimburse(reimburse.id);
      toast.success('Reimbursed and recorded in the ledger');
      setReimburse(null);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['useFetch'] });
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      reload();
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    { key: 'createdAt', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
    {
      key: 'submitter',
      header: 'Claimant',
      render: (row) => (
        <div>
          <p className="font-medium text-cf-fg">{row.submittedBy?.name}</p>
          <p className="text-xs text-cf-muted">{row.event?.title ?? row.fundraiser?.title ?? 'General'}</p>
        </div>
      ),
    },
    { key: 'description', header: 'Description', render: (row) => <span className="block max-w-xs">{row.description}</span> },
    { key: 'category', header: 'Category', render: (row) => <Badge tone="gray">{humanize(row.category)}</Badge> },
    { key: 'amount', header: 'Amount', className: 'tabular-nums font-medium text-cf-fg', render: (row) => formatCurrency(row.amount) },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (row) =>
        row.receiptUrl ? (
          <Button size="sm" variant="ghost" icon={LuPaperclip} onClick={() => setReceipt(row.receiptUrl)}>View</Button>
        ) : (
          <span className="text-cf-muted">None</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <Badge status={row.status} />
          {row.reviewNote && <p className="mt-1 max-w-[12rem] text-xs text-cf-muted">{row.reviewNote}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === 'SUBMITTED' && (
            <>
              <Button size="sm" variant="success" icon={LuCheck} onClick={() => setReview({ expense: row, decision: 'APPROVED' })}>Approve</Button>
              <Button size="sm" variant="secondary" icon={LuX} onClick={() => setReview({ expense: row, decision: 'REJECTED' })}>Reject</Button>
            </>
          )}
          {row.status === 'APPROVED' && (
            <Button size="sm" onClick={() => setReimburse(row)}>Reimburse</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Expense claims" subtitle="Review claims, then reimburse approved ones. Each reimbursement is recorded in the ledger exactly once." />
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-cf-divider p-4">
          <div className="inline-flex flex-wrap rounded-lg bg-cf-subtle p-1" role="tablist">
            {[['', 'All'], ...EXPENSE_STATUSES.map((value) => [value, humanize(value)])].map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                role="tab"
                aria-selected={status === value}
                onClick={() => { setStatus(value); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === value ? 'bg-white text-primary-700 ' : 'text-cf-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Select aria-label="filter by category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) }))} />
          <div className="relative min-w-[12rem] flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cf-muted" aria-hidden="true" />
            <Input aria-label="Search claims" className="[&_input]:pl-9" placeholder="Search description or claimant" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <Table columns={columns} rows={data} loading={loading} emptyIcon={LuFileText} emptyTitle="No claims here" emptyMessage="Claims that match this tab will be listed here." />
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(review)}
        title={review?.decision === 'APPROVED' ? 'Approve claim' : 'Reject claim'}
        onClose={() => setReview(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReview(null)} disabled={working}>Cancel</Button>
            <Button variant={review?.decision === 'APPROVED' ? 'success' : 'danger'} onClick={submitReview} loading={working}>
              {review?.decision === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-cf-muted">
          {review?.expense.description} for {formatCurrency(review?.expense.amount ?? 0)} from {review?.expense.submittedBy?.name}.
        </p>
        <Input label="Note to the claimant (optional)" as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(reimburse)}
        title="Reimburse claim"
        message={`Record a reimbursement of ${formatCurrency(reimburse?.amount ?? 0)} to ${reimburse?.submittedBy?.name}? This adds one expense row to the ledger and cannot be repeated.`}
        confirmLabel="Reimburse"
        loading={working}
        onConfirm={submitReimburse}
        onCancel={() => setReimburse(null)}
      />
      <ReceiptPreview key={receipt} receiptUrl={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
