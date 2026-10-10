import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import Table from '../ui/Table';

export default function LedgerTable({ rows, meta, loading, sort, onSort, onPage }) {
  const columns = [
    { key: 'occurredAt', header: 'Date', sortable: true, render: (row) => formatDate(row.occurredAt) },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.description || humanize(row.category)}</p>
          <p className="text-xs text-slate-500">{humanize(row.sourceType)}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => <Badge tone="gray">{humanize(row.category)}</Badge> },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-slate-700">
          {row.type === 'INCOME' ? (
            <LuArrowDownLeft className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          ) : (
            <LuArrowUpRight className="h-4 w-4 text-red-700" aria-hidden="true" />
          )}
          {humanize(row.type)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right tabular-nums font-medium text-slate-900',
      render: (row) => `${row.type === 'INCOME' ? '+' : '-'} ${formatCurrency(row.amount)}`,
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        rows={rows}
        loading={loading}
        sort={sort}
        onSort={onSort}
        emptyTitle="No ledger entries"
        emptyMessage="Try widening the filters or record a manual entry."
      />
      <Pagination meta={meta} onPage={onPage} />
    </div>
  );
}
