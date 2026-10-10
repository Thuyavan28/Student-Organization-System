import { useState } from 'react';
import { FiCheck, FiSearch, FiShoppingBag, FiXCircle } from 'react-icons/fi';
import { apiErrorMessage } from '../../api/axiosInstance';
import { ordersApi } from '../../api/orders.api';
import { itemLabel } from '../member/MyOrders';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { ORDER_STATUSES, humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function Orders() {
  const toast = useToast();
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [working, setWorking] = useState(false);
  const q = useDebounce(search);

  const { data, meta, loading, error, reload } = useFetch(
    () => ordersApi.list({ q: q || undefined, status: status || undefined, page, pageSize: 15 }),
    [q, status, page],
  );

  const apply = async () => {
    setWorking(true);
    try {
      await ordersApi.updateStatus(pending.order.id, pending.status);
      toast.success(`Order #${pending.order.id} marked ${humanize(pending.status).toLowerCase()}`);
      setPending(null);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    { key: 'id', header: 'Order', render: (row) => <span className="font-medium">#{row.id}</span> },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.user?.name}</p>
          <p className="text-xs text-slate-500">{row.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (row) => (
        <ul className="text-xs">
          {(row.items ?? []).map((item) => (
            <li key={item.id}>{itemLabel(item)} x {item.quantity}</li>
          ))}
        </ul>
      ),
    },
    { key: 'total', header: 'Total', className: 'tabular-nums font-medium', render: (row) => formatCurrency(row.total) },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'paymentStatus', header: 'Payment', render: (row) => <Badge status={row.paymentStatus} /> },
    { key: 'createdAt', header: 'Placed', render: (row) => formatDateTime(row.createdAt) },
    ...(canManage
      ? [{
          key: 'actions',
          header: '',
          render: (row) =>
            row.status === 'PAID' || row.status === 'PLACED' ? (
              <div className="flex justify-end gap-1">
                {row.status === 'PAID' && (
                  <Button size="sm" variant="secondary" icon={FiCheck} onClick={() => setPending({ order: row, status: 'FULFILLED' })}>Fulfil</Button>
                )}
                <Button size="sm" variant="ghost" icon={FiXCircle} onClick={() => setPending({ order: row, status: 'CANCELLED' })}>Cancel</Button>
              </div>
            ) : null,
        }]
      : []),
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="All merchandise orders. Cancelling returns stock and records a refund in the ledger." />
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input aria-label="Search orders" className="[&_input]:pl-9" placeholder="Search buyer name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            placeholder="All statuses"
            options={ORDER_STATUSES.map((value) => ({ value, label: humanize(value) }))}
          />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <Table columns={columns} rows={data} loading={loading} emptyIcon={FiShoppingBag} emptyTitle="No orders found" emptyMessage="Orders placed in the shop will appear here." />
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.status === 'CANCELLED' ? 'Cancel order' : 'Mark order fulfilled'}
        message={
          pending?.status === 'CANCELLED'
            ? `Order #${pending?.order.id} will be cancelled, its stock returned and the payment refunded (demo).`
            : `Mark order #${pending?.order.id} as handed over to the buyer?`
        }
        confirmLabel={pending?.status === 'CANCELLED' ? 'Cancel order' : 'Mark fulfilled'}
        variant={pending?.status === 'CANCELLED' ? 'danger' : 'primary'}
        loading={working}
        onConfirm={apply}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
