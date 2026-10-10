import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuCalendar,
  LuPencil,
  LuList,
  LuPlus,
  LuSearch,
  LuSend,
  LuUsers,
  LuTicket,
  LuClock,
  LuFilePen,
  LuCheckCheck,
  LuMapPin,
  LuTag,
} from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { eventsApi } from '../../api/events.api';
import EventDetailModal from '../../components/feature/EventDetailModal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { EVENT_STATUSES, humanize } from '../../utils/constants';
import { formatCurrency, toPaise, toRupeesInput } from '../../utils/formatCurrency';
import { formatDateTime, toDateTimeLocal } from '../../utils/formatDate';

function blankForm() {
  const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const iso = (date) => toDateTimeLocal(date);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const closes = new Date(start.getTime() - 60 * 60 * 1000);
  return {
    title: '',
    description: '',
    venue: '',
    capacity: '50',
    memberPrice: '300',
    nonMemberPrice: '500',
    startAt: iso(start),
    endAt: iso(end),
    bookingOpensAt: iso(new Date()),
    bookingClosesAt: iso(closes),
  };
}

function formFromEvent(event) {
  return {
    title: event.title,
    description: event.description ?? '',
    venue: event.venue,
    capacity: String(event.capacity),
    memberPrice: toRupeesInput(event.memberPrice),
    nonMemberPrice: toRupeesInput(event.nonMemberPrice),
    startAt: toDateTimeLocal(event.startAt),
    endAt: toDateTimeLocal(event.endAt),
    bookingOpensAt: toDateTimeLocal(event.bookingOpensAt),
    bookingClosesAt: toDateTimeLocal(event.bookingClosesAt),
  };
}

function validate(form) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = 'Enter a title';
  if (!form.venue.trim()) errors.venue = 'Enter a venue';
  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Capacity must be at least 1';
  if (toPaise(form.memberPrice) < 0 || form.memberPrice === '') errors.memberPrice = 'Enter a price (0 for free)';
  if (toPaise(form.nonMemberPrice) < 0 || form.nonMemberPrice === '') errors.nonMemberPrice = 'Enter a price (0 for free)';
  const times = ['startAt', 'endAt', 'bookingOpensAt', 'bookingClosesAt'].map((key) => new Date(form[key]).getTime());
  if (times.some(Number.isNaN)) errors.startAt = 'Fill in every date and time';
  else {
    const [start, end, opens, closes] = times;
    if (end <= start) errors.endAt = 'End must be after the start';
    if (opens >= closes) errors.bookingOpensAt = 'Booking must open before it closes';
    if (closes > end) errors.bookingClosesAt = 'Booking must close before the event ends';
  }
  return errors;
}

function EventForm({ event, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(event ? formFromEvent(event) : blankForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((current) => ({ ...current, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      venue: form.venue.trim(),
      capacity: Number(form.capacity),
      memberPrice: toPaise(form.memberPrice),
      nonMemberPrice: toPaise(form.nonMemberPrice),
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      bookingOpensAt: new Date(form.bookingOpensAt).toISOString(),
      bookingClosesAt: new Date(form.bookingClosesAt).toISOString(),
    };
    setSaving(true);
    try {
      if (event) await eventsApi.update(event.id, payload);
      else await eventsApi.create(payload);
      toast.success(event ? 'Event updated successfully' : 'Draft event created');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={event ? `Edit ${event.title}` : 'Create New Event'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" loading={saving}>
            {event ? 'Save changes' : 'Create draft'}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" value={form.title} onChange={set('title')} error={errors.title} />
        <Input className="sm:col-span-2" label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} error={errors.description} />
        <Input label="Venue" value={form.venue} onChange={set('venue')} error={errors.venue} />
        <Input label="Capacity (seats)" type="number" min="1" value={form.capacity} onChange={set('capacity')} error={errors.capacity} />
        <Input label="Member price (Rs)" type="number" min="0" step="0.01" value={form.memberPrice} onChange={set('memberPrice')} error={errors.memberPrice} />
        <Input label="Non-member price (Rs)" type="number" min="0" step="0.01" value={form.nonMemberPrice} onChange={set('nonMemberPrice')} error={errors.nonMemberPrice} />
        <Input label="Starts" type="datetime-local" value={form.startAt} onChange={set('startAt')} error={errors.startAt} />
        <Input label="Ends" type="datetime-local" value={form.endAt} onChange={set('endAt')} error={errors.endAt} />
        <Input label="Booking opens" type="datetime-local" value={form.bookingOpensAt} onChange={set('bookingOpensAt')} error={errors.bookingOpensAt} />
        <Input label="Booking closes" type="datetime-local" value={form.bookingClosesAt} onChange={set('bookingClosesAt')} error={errors.bookingClosesAt} />
      </form>
    </Modal>
  );
}

export default function Events() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [action, setAction] = useState(null);
  const [working, setWorking] = useState(false);
  const q = useDebounce(search);

  // Fetch full stats summary for KPI cards
  const { data: globalEventsData, reload: reloadGlobal } = useFetch(
    () => eventsApi.list({ pageSize: 100 }),
    [],
    { key: 'admin-events-global' },
  );

  // Fetch paginated & filtered list for table
  const { data, meta, loading, error, reload } = useFetch(
    () => eventsApi.list({ q: q || undefined, status: status || undefined, page, pageSize: 12 }),
    [q, status, page],
    { key: 'admin-events-filtered' },
  );

  const eventsList = Array.isArray(data) ? data : [];
  const allEvents = Array.isArray(globalEventsData) ? globalEventsData : eventsList;

  // Global KPI numbers
  const totalEvents = allEvents.length || meta?.total || 0;
  const publishedEvents = allEvents.filter((e) => e.status === 'PUBLISHED').length;
  const completedEvents = allEvents.filter((e) => e.status === 'COMPLETED').length;
  const draftEvents = allEvents.filter((e) => e.status === 'DRAFT').length;
  const totalTicketsSold = allEvents.reduce((sum, e) => sum + (e.bookedCount ?? 0), 0);

  const runAction = async () => {
    setWorking(true);
    try {
      if (action.kind === 'publish') await eventsApi.publish(action.event.id);
      else await eventsApi.setStatus(action.event.id, action.kind === 'complete' ? 'COMPLETED' : 'CANCELLED');
      toast.success(`${action.event.title}: ${action.verb}`);
      setAction(null);
      reload();
      reloadGlobal();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const statusTabs = [
    { key: '', label: 'All Events', count: totalEvents },
    { key: 'PUBLISHED', label: 'Published', count: publishedEvents },
    { key: 'COMPLETED', label: 'Completed', count: completedEvents },
    { key: 'DRAFT', label: 'Drafts', count: draftEvents },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events Management"
        subtitle="Schedule campus events, track real-time ticket sales, capacity fill, and view registered attendee rosters."
        actions={
          <Button icon={LuPlus} onClick={() => setFormState({ event: null })}>
            Create event
          </Button>
        }
      />

      {/* Top Event KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total events" value={totalEvents} sub="All campus events" icon={LuCalendar} />
        <StatCard label="Published / live" value={publishedEvents} sub="Open for ticket booking" icon={LuClock} />
        <StatCard label="Completed" value={completedEvents} sub="Past campus events" icon={LuCheckCheck} />
        <StatCard label="Tickets sold" value={totalTicketsSold} sub="Confirmed seats booked" icon={LuTicket} />
        <StatCard label="Drafts" value={draftEvents} sub="Unpublished planning" icon={LuFilePen} />
      </div>

      {/* Main Events Table Card */}
      <Card padded={false}>
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-cf-divider px-4 py-3">
          {statusTabs.map((tab) => {
            const active = status === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatus(tab.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-cf-fg text-white' : 'text-cf-fg hover:bg-cf-hover'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 text-[11px] font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-cf-subtle text-cf-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-divider p-4">
          <div className="relative min-w-[14rem] flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cf-muted" />
            <input
              type="text"
              placeholder="Search event title, venue, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-base pl-9"
            />
          </div>

          <div className="w-48">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              placeholder="All statuses"
              options={EVENT_STATUSES.map((val) => ({ value: val, label: humanize(val) }))}
            />
          </div>
        </div>

        {/* Table Content */}
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : eventsList.length === 0 ? (
          <EmptyState
            icon={LuCalendar}
            title="No events found"
            message={
              status
                ? `No events match the status "${humanize(status)}". Try switching to All Events.`
                : 'Create a new event or adjust your search filter.'
            }
            action={
              status ? (
                <Button size="sm" variant="secondary" onClick={() => setStatus('')}>
                  View All Events
                </Button>
              ) : (
                <Button icon={LuPlus} onClick={() => setFormState({ event: null })}>
                  Create event
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-cf-fg/80 text-xs font-semibold text-cf-fg">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Event Name & Venue
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Date & Time
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Ticket Sales & Capacity Fill
                    </th>
                    <th scope="col" className="px-4 py-3 tabular-nums">
                      Pricing (M / NM)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cf-divider">
                  {eventsList.map((row) => {
                    const booked = row.bookedCount ?? 0;
                    const capacity = row.capacity ?? 0;
                    const remaining = Math.max(0, capacity - booked);
                    const fillPercent = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;

                    return (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-cf-subtle cursor-pointer group"
                        onClick={() => setSelectedEventModal(row)}
                      >
                        {/* Event Name & Venue */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-cf-fg group-hover:underline transition-colors">
                              {row.title}
                            </span>
                            <span className="text-xs text-cf-muted mt-0.5 flex items-center gap-1">
                              <LuMapPin className="h-3 w-3 text-cf-muted" />
                              {row.venue || 'Campus Venue'}
                            </span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-4 text-xs font-medium text-cf-muted whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <LuCalendar className="h-3.5 w-3.5 text-cf-muted" />
                            {formatDateTime(row.startAt)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge status={row.status} />
                        </td>

                        {/* Ticket Sales & Fill Progress */}
                        <td className="px-5 py-4 tabular-nums">
                          <div
                            className="flex flex-col gap-1 min-w-[150px] max-w-[200px]"
                            title="Click to view registered attendee roster"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-cf-fg group-hover:underline transition-colors">
                                {booked} / {capacity} sold
                              </span>
                              <span
                                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  remaining === 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : remaining <= 5
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {remaining === 0 ? 'Sold out' : `${remaining} left`}
                              </span>
                            </div>

                            {/* Visual Fill Progress Bar */}
                            <div className="h-2 w-full rounded-full bg-cf-subtle overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  fillPercent >= 100
                                    ? 'bg-rose-500'
                                    : fillPercent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, fillPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Pricing */}
                        <td className="px-5 py-4 tabular-nums text-xs font-semibold text-cf-fg whitespace-nowrap">
                          {formatCurrency(row.memberPrice)}{' '}
                          <span className="text-cf-muted font-normal">/ {formatCurrency(row.nonMemberPrice)}</span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Attendees popup button */}
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={LuUsers}
                              onClick={() => setSelectedEventModal(row)}
                              title="View registered attendees and capacity popup"
                              className="text-xs font-semibold hover:border-cf-fg"
                            >
                              Attendees
                            </Button>

                            <Link to={`/admin/events/${row.id}/bookings`}>
                              <Button size="sm" variant="ghost" icon={LuList} title="Event Bookings Table" />
                            </Link>

                            {row.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="primary"
                                icon={LuSend}
                                onClick={() => setAction({ kind: 'publish', event: row, verb: 'published' })}
                              >
                                Publish
                              </Button>
                            )}

                            {row.status === 'PUBLISHED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setAction({ kind: 'complete', event: row, verb: 'marked completed' })}
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAction({ kind: 'cancel', event: row, verb: 'cancelled' })}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={LuPencil}
                                aria-label={`Edit ${row.title}`}
                                onClick={() => setFormState({ event: row })}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Popup: Attendee Names & Fill Capacity Modal */}
      {selectedEventModal && (
        <EventDetailModal
          event={selectedEventModal}
          open={Boolean(selectedEventModal)}
          onClose={() => setSelectedEventModal(null)}
        />
      )}

      {/* Event Create / Edit Form Modal */}
      {formState && (
        <EventForm
          event={formState.event}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            reload();
            reloadGlobal();
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(action)}
        title={action ? `${humanize(action.kind)} event` : ''}
        message={
          action?.kind === 'publish'
            ? `Publish "${action?.event.title}"? It will become visible on the public site and open for bookings.`
            : `This will mark "${action?.event.title}" as ${action?.verb}.`
        }
        confirmLabel={action ? humanize(action.kind) : 'Confirm'}
        variant={action?.kind === 'cancel' ? 'danger' : 'primary'}
        loading={working}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
    </div>
  );
}
