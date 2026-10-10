import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuTag } from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { bookingsApi } from '../../api/bookings.api';
import TicketCard from '../../components/feature/TicketCard';
import Button from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';

export default function MyTickets() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { data, meta, loading, error, reload } = useFetch(() => bookingsApi.mine({ page, pageSize: 10 }), [page]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await bookingsApi.cancel(toCancel.id);
      toast.success('Booking cancelled and refunded (demo)');
      setToCancel(null);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <PageHeader title="My tickets" subtitle="Show the QR code at the door. It contains only a ticket code, never your personal details." />
      {loading && <Skeleton className="h-64 w-full" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState
          icon={LuTag}
          title="No tickets yet"
          message="Book a ticket for an upcoming event and it will show up here."
          action={<Link to="/events"><Button>Browse events</Button></Link>}
        />
      )}
      {data?.length > 0 && (
        <div className="space-y-4">
          {data.map((booking) => (
            <TicketCard key={booking.id} booking={booking} onCancel={setToCancel} />
          ))}
          <div className="rounded-xl border border-cf-divider bg-white">
            <Pagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel this booking?"
        message="Your ticket stops working and the seat is released. A cancelled booking cannot be re-booked for the same event."
        confirmLabel="Cancel booking"
        variant="danger"
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}
