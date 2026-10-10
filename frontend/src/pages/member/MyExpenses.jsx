import { useState } from 'react';
import { FiFileText, FiPaperclip } from 'react-icons/fi';
import { expensesApi } from '../../api/expenses.api';
import ExpenseForm from '../../components/feature/ExpenseForm';
import ReceiptPreview from '../../components/feature/ReceiptPreview';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Table from '../../components/ui/Table';
import { useFetch } from '../../hooks/useFetch';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function MyExpenses() {
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const { data, meta, loading, error, reload } = useFetch(() => expensesApi.mine({ page, pageSize: 10 }), [page]);

  const columns = [
    { key: 'createdAt', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
    { key: 'description', header: 'Description', render: (row) => <span className="font-medium text-slate-900">{row.description}</span> },
    { key: 'category', header: 'Category', render: (row) => humanize(row.category) },
    { key: 'amount', header: 'Amount', className: 'tabular-nums', render: (row) => formatCurrency(row.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <Badge status={row.status} />
          {row.reviewNote && <p className="mt-1 max-w-[14rem] text-xs text-slate-500">{row.reviewNote}</p>}
        </div>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (row) =>
        row.receiptUrl ? (
          <Button size="sm" variant="ghost" icon={FiPaperclip} onClick={() => setReceipt(row.receiptUrl)}>View</Button>
        ) : (
          <span className="text-slate-400">None</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="My expense claims" subtitle="Paid for something for the club? Submit it with the receipt and the treasurer will review it." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Card title="New claim">
          <ExpenseForm onSubmitted={() => { setPage(1); reload(); }} />
        </Card>
        <Card title="Claim history" padded={false}>
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
              <Table
                columns={columns}
                rows={data}
                loading={loading}
                emptyIcon={FiFileText}
                emptyTitle="No claims yet"
                emptyMessage="Claims you submit will appear here with their review status."
              />
              <Pagination meta={meta} onPage={setPage} />
            </>
          )}
        </Card>
      </div>
      <ReceiptPreview key={receipt} receiptUrl={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
