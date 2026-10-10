import { Link } from 'react-router-dom';
import { LuCalendar, LuMapPin } from 'react-icons/lu';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, isPast } from '../../utils/formatDate';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import QrTicket from './QrTicket';

export default function TicketCard({ booking, onCancel }) {
  const { event, ticket } = booking;
  const cancelled = booking.status === 'CANCELLED' || ticket?.status === 'CANCELLED';
  const canCancel = !cancelled && ticket?.status === 'VALID' && event && !isPast(event.startAt);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={cancelled ? 'CANCELLED' : ticket?.status} />
            {booking.isMemberPrice && <Badge tone="blue">Member price</Badge>}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            <Link to={`/events/${event?.id ?? booking.eventId}`} className="hover:text-primary-700">
              {event?.title ?? 'Event'}
            </Link>
          </h3>
          {event && (
            <ul className="space-y-1 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <LuCalendar aria-hidden="true" /> {formatDateTime(event.startAt)}
              </li>
              <li className="flex items-center gap-2">
                <LuMapPin aria-hidden="true" /> {event.venue}
              </li>
            </ul>
          )}
          <p className="text-sm text-slate-600">
            Paid {formatCurrency(booking.priceAtBooking)}
            {booking.discountApplied > 0 && ` (saved ${formatCurrency(booking.discountApplied)} as a member)`}
          </p>
          {canCancel && (
            <Button className="no-print" size="sm" variant="secondary" onClick={() => onCancel(booking)}>
              Cancel booking
            </Button>
          )}
        </div>
        {ticket?.token && (
          <div className="flex flex-col items-center">
            <QrTicket token={ticket.token} fileName={`ticket-${booking.id}`} dimmed={cancelled || ticket.status === 'USED'} />
            <p className="mt-2 max-w-[13rem] break-all text-center font-mono text-[10px] text-slate-400">{ticket.token}</p>
          </div>
        )}
      </div>
    </article>
  );
}
