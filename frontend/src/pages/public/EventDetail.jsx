import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuCalendar, LuCircleCheck, LuClock, LuMapPin, LuUsers } from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { bookingsApi } from '../../api/bookings.api';
import { eventsApi } from '../../api/events.api';
import PaymentQrModal from '../../components/feature/PaymentQrModal';
import TicketConfirmationModal from '../../components/feature/TicketConfirmationModal';
import PublicNavbar from '../../components/layout/PublicNavbar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

function bookingState(event, now = Date.now()) {
  if (event.yourBooking?.status === 'CONFIRMED') return { canBook: false, reason: 'You already have a ticket for this event.' };
  if (event.status !== 'PUBLISHED') return { canBook: false, reason: 'Booking is not open for this event.' };
  if (now < new Date(event.bookingOpensAt).getTime()) return { canBook: false, reason: `Booking opens ${formatDateTime(event.bookingOpensAt)}.` };
  if (now > new Date(event.bookingClosesAt).getTime() || now > new Date(event.endAt).getTime()) {
    return { canBook: false, reason: 'Booking has closed.' };
  }
  if (event.seatsRemaining <= 0) return { canBook: false, reason: 'This event is sold out.' };
  return { canBook: true, reason: '' };
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const { data: event, loading, error, reload } = useFetch(() => eventsApi.get(id), [id, user?.id]);

  if (loading && !event) return (<><PublicNavbar /><PageSpinner /></>);
  if (error || !event) {
    return (
      <>
        <PublicNavbar />
        <ErrorState message={error ?? 'Event not found'} onRetry={reload} />
      </>
    );
  }

  const state = bookingState(event);
  const price = user ? event.yourPrice ?? event.nonMemberPrice : event.nonMemberPrice;
  const isMemberPrice = Boolean(user && event.isMemberPrice);
  const saving = event.nonMemberPrice - event.memberPrice;
  const booked = event.bookedCount ?? event.capacity - event.seatsRemaining;

  const startBooking = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    setConfirmOpen(true);
  };

  const confirmBooking = async (paymentMeta) => {
    setBooking(true);
    try {
      const res = await bookingsApi.create(event.id);
      toast.success('Payment verified! Your ticket QR is generated.');
      setConfirmOpen(false);
      setBookingResult({
        ...res.data,
        verificationCode: paymentMeta?.verificationCode,
      });
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setConfirmOpen(false);
      reload();
    } finally {
      setBooking(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-cf-muted hover:text-cf-fg">
          <LuArrowLeft aria-hidden="true" /> All events
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={event.status} />
              {event.seatsRemaining > 0 && event.status === 'PUBLISHED' && (
                <Badge tone={event.seatsRemaining <= 10 ? 'amber' : 'green'}>{event.seatsRemaining} seats left</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-cf-fg">{event.title}</h1>
            <ul className="space-y-2 text-cf-muted">
              <li className="flex items-center gap-2"><LuCalendar aria-hidden="true" /> {formatDateTime(event.startAt)}</li>
              <li className="flex items-center gap-2"><LuClock aria-hidden="true" /> Ends {formatDateTime(event.endAt)}</li>
              <li className="flex items-center gap-2"><LuMapPin aria-hidden="true" /> {event.venue}</li>
              <li className="flex items-center gap-2"><LuUsers aria-hidden="true" /> {booked} of {event.capacity} seats booked</li>
            </ul>
            <p className="whitespace-pre-line leading-relaxed text-cf-muted">{event.description}</p>
          </div>

          <Card title="Tickets" className="self-start lg:sticky lg:top-20">
            <div className="space-y-5">
              <dl className="space-y-3 text-sm">
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isMemberPrice ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}>
                  <dt className="text-cf-muted">Member price</dt>
                  <dd className={`font-semibold ${isMemberPrice ? 'text-emerald-700' : 'text-cf-fg'}`}>{formatCurrency(event.memberPrice)}</dd>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <dt className="text-cf-muted">Non-member price</dt>
                  <dd className="font-semibold text-cf-fg">{formatCurrency(event.nonMemberPrice)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-cf-divider px-3 pt-4">
                  <dt className="font-medium text-cf-fg">{user ? 'Your price' : 'Price'}</dt>
                  <dd className="text-2xl font-bold text-cf-fg">{formatCurrency(price)}</dd>
                </div>
              </dl>

              {!isMemberPrice && saving > 0 && (
                <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
                  Members save {formatCurrency(saving)} on this event.{' '}
                  <Link className="font-medium underline" to={user ? '/me' : '/register'}>
                    {user ? 'Join the club' : 'Sign up to join'}
                  </Link>
                </p>
              )}
              {isMemberPrice && (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <LuCircleCheck aria-hidden="true" /> Member price applied
                </p>
              )}

              <div className="space-y-2">
                <Button className="w-full" size="lg" disabled={!state.canBook} onClick={startBooking}>
                  {user ? 'Book my ticket' : 'Log in to book'}
                </Button>
                {!state.canBook && <p className="text-center text-sm text-cf-muted">{state.reason}</p>}
                {event.yourBooking?.status === 'CONFIRMED' && (
                  <Link to="/me/tickets" className="block text-center text-sm font-medium text-primary-700 hover:underline">
                    View my ticket
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </div>
      </main>

      <PaymentQrModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Book Ticket: ${event.title}`}
        amount={price}
        note={`Ticket for ${event.title}`}
        onConfirm={confirmBooking}
        loading={booking}
      />

      <TicketConfirmationModal
        open={Boolean(bookingResult)}
        onClose={() => setBookingResult(null)}
        bookingData={bookingResult}
        event={event}
      />
    </>
  );
}
