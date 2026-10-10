import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LuCalendar,
  LuMapPin,
  LuUsers,
  LuTicket,
  LuSearch,
  LuCircleCheck,
  LuClock,
  LuExternalLink,
  LuCopy,
  LuCheck,
  LuSquareCheck,
  LuTag,
} from 'react-icons/lu';
import { eventsApi } from '../../api/events.api';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function EventDetailModal({ event, open, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'CHECKED_IN'
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    if (open && event?.id) {
      setLoading(true);
      setSearch('');
      setFilter('ALL');
      eventsApi
        .bookings(event.id, { pageSize: 100 })
        .then((res) => {
          const list = res?.data || res?.items || res || [];
          setBookings(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          setBookings([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, event?.id]);

  const copyToken = (token) => {
    if (!token) return;
    navigator.clipboard?.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const bookedCount = event?.bookedCount ?? bookings.filter((b) => b.status === 'CONFIRMED').length;
  const capacity = event?.capacity ?? 0;
  const remaining = Math.max(0, capacity - bookedCount);
  const fillRate = capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0;
  const checkedInCount = bookings.filter((b) => b.checkedInAt).length;

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const name = b.user?.name?.toLowerCase() || '';
      const email = b.user?.email?.toLowerCase() || '';
      const token = b.ticketToken?.toLowerCase() || '';
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || token.includes(q);

      if (filter === 'CHECKED_IN') return matchesSearch && Boolean(b.checkedInAt);
      if (filter === 'CONFIRMED') return matchesSearch && b.status === 'CONFIRMED';
      return matchesSearch;
    });
  }, [bookings, search, filter]);

  if (!event) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="truncate">{event.title}</span>
          <Badge status={event.status} />
        </div>
      }
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to={`/admin/check-in`}>
              <Button size="sm" variant="secondary" icon={LuSquareCheck}>
                Check-In Desk
              </Button>
            </Link>
            <Link to={`/admin/events/${event.id}/bookings`}>
              <Button size="sm" variant="ghost" icon={LuExternalLink}>
                Full Roster
              </Button>
            </Link>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Event Schedule & Location Banner */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-200">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <LuCalendar className="h-4 w-4 text-slate-500" />
            {formatDateTime(event.startAt)}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <LuMapPin className="h-4 w-4 text-slate-500" />
            {event.venue || 'TBA'}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <LuTag className="h-4 w-4 text-slate-500" />
            {formatCurrency(event.memberPrice)} (Members) / {formatCurrency(event.nonMemberPrice)} (Non-members)
          </span>
        </div>

        {/* Capacity & Ticket Sale Fill Metrics */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ticket Sales & Capacity Fill
            </h4>
            <span className="text-xs font-bold text-slate-900">{fillRate}% filled</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Tickets Sold</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-600">{bookedCount}</p>
              <p className="text-[11px] text-slate-400">of {capacity} capacity</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Remaining Seats</p>
              <p className={`mt-1 text-2xl font-extrabold tabular-nums ${remaining > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {remaining}
              </p>
              <p className="text-[11px] text-slate-400">{remaining > 0 ? 'Available to book' : 'Sold out'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Total Capacity</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{capacity}</p>
              <p className="text-[11px] text-slate-400">Total hall limit</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Checked In</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{checkedInCount}</p>
              <p className="text-[11px] text-slate-400">Arrived at event</p>
            </div>
          </div>

          {/* Progress fill bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                fillRate >= 100 ? 'bg-rose-500' : fillRate >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, fillRate)}%` }}
            />
          </div>
        </div>

        {/* Person Names & Attendees List Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Registered Attendees</h4>
              <p className="text-xs text-slate-500">Students who have booked a ticket for this event</p>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('CONFIRMED')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'CONFIRMED'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Confirmed ({bookedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('CHECKED_IN')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'CHECKED_IN'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Checked In ({checkedInCount})
              </button>
            </div>
          </div>

          {/* Search box inside modal */}
          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search attendee by name, email or ticket code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Attendee table */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Spinner className="h-6 w-6 text-slate-700" />
                <p className="mt-2 text-xs">Loading attendee list...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {search ? 'No attendees match your search query.' : 'No attendees have registered for this event yet.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Person Name</th>
                    <th className="py-2.5 px-3">Ticket Code</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => {
                    const isChecked = Boolean(b.checkedInAt);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 leading-tight">
                            {b.user?.name || 'Registered Guest'}
                          </p>
                          <p className="text-[11px] text-slate-500">{b.user?.email}</p>
                        </td>

                        <td className="py-2.5 px-3">
                          {b.ticketToken ? (
                            <button
                              type="button"
                              onClick={() => copyToken(b.ticketToken)}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 hover:bg-slate-200 transition-colors"
                              title="Click to copy ticket code"
                            >
                              <span>{b.ticketToken.slice(0, 10)}...</span>
                              {copiedToken === b.ticketToken ? (
                                <LuCheck className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <LuCopy className="h-3 w-3 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {isChecked ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <LuCircleCheck className="h-3.5 w-3.5" />
                              Checked in
                            </span>
                          ) : b.status === 'CONFIRMED' ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <LuClock className="h-3.5 w-3.5 text-amber-500" />
                              Confirmed
                            </span>
                          ) : (
                            <Badge tone="red">{b.status}</Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 tabular-nums">
                          {formatCurrency(b.priceAtBooking)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
