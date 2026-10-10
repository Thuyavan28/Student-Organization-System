import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuShoppingBag } from 'react-icons/lu';
import { ordersApi } from '../../api/orders.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import { useFetch } from '../../hooks/useFetch';
import { itemLabel } from '../../utils/itemLabel';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function MyOrders() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch(
    () => ordersApi.mine({ page, pageSize: 10 }),
    [page],
    { key: 'my-orders-list' },
  );

  return (
    <>
      <PageHeader title="My orders" subtitle="Merchandise you ordered from the club shop." />
      {loading && <Skeleton className="h-48 w-full" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={LuShoppingBag}
          title="No orders yet"
          message="Your merchandise orders will show up here."
          action={<Link to="/shop"><Button>Visit the shop</Button></Link>}
        />
      )}
      {data?.length > 0 && (
        <div className="space-y-4">
          {data.map((order) => (
            <Card
              key={order.id}
              title={`Order #${order.id}`}
              subtitle={formatDateTime(order.createdAt)}
              action={<Badge status={order.status} />}
            >
              <div className="p-6">
                <ul className="divide-y divide-cf-divider text-sm">
                  {(order.items ?? []).map((item) => (
                    <li key={item.id} className="flex justify-between py-2">
                      <span>{itemLabel(item)} x {item.quantity}</span>
                      <span className="tabular-nums">{formatCurrency(item.unitPrice * item.quantity - item.discountApplied)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-1.5 border-t border-cf-divider pt-4 text-sm">
                  {order.discountTotal > 0 && (
                    <div className="flex justify-between text-cf-muted"><dt>Member discount</dt><dd className="tabular-nums">- {formatCurrency(order.discountTotal)}</dd></div>
                  )}
                  <div className="flex justify-between font-semibold text-cf-fg"><dt>Total ({humanize(order.paymentStatus)})</dt><dd className="tabular-nums">{formatCurrency(order.total)}</dd></div>
                </dl>
              </div>
            </Card>
          ))}
          <div className="rounded-xl border border-cf-divider bg-white"><Pagination meta={meta} onPage={setPage} /></div>
        </div>
      )}
    </>
  );
}
