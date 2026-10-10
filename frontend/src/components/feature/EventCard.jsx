import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import Badge from '../ui/Badge';

function availability(event) {
  if (event.status === 'COMPLETED') return { label: 'Completed', tone: 'gray' };
  if (event.status === 'CANCELLED') return { label: 'Cancelled', tone: 'red' };
  if (event.seatsRemaining <= 0) return { label: 'Sold out', tone: 'red' };
  if (event.seatsRemaining <= 10) return { label: `${event.seatsRemaining} seats left`, tone: 'amber' };
  return { label: `${event.seatsRemaining} seats left`, tone: 'green' };
}

export default function EventCard({ event }) {
  const state = availability(event);
  const booked = event.bookedCount ?? 0;
  const fill = Math.min(100, Math.round((booked / event.capacity) * 100));

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-700" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-700">{event.title}</h3>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <FiCalendar aria-hidden="true" /> {formatDateTime(event.startAt)}
          </li>
          <li className="flex items-center gap-2">
            <FiMapPin aria-hidden="true" /> {event.venue}
          </li>
          <li className="flex items-center gap-2">
            <FiUsers aria-hidden="true" /> {booked} of {event.capacity} booked
          </li>
        </ul>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-primary-500" style={{ width: `${fill}%` }} />
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Members</p>
            <p className="font-semibold text-primary-700">{formatCurrency(event.memberPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Non-members</p>
            <p className="font-semibold text-slate-800">{formatCurrency(event.nonMemberPrice)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
