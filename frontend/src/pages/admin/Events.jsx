import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCalendar, LuPencil, LuList, LuPlus, LuSearch, LuSend } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { eventsApi } from '../../api/events.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataCard from '../../components/ui/DataCard';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterCard, { FilterField } from '../../components/ui/FilterCard';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
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
    title: '', description: '', venue: '', capacity: '50', memberPrice: '300', nonMemberPrice: '500',
    startAt: iso(start), endAt: iso(end), bookingOpensAt: iso(new Date()), bookingClosesAt: iso(closes),
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
  if (times.some(Number.isNaN)) errors.startAt = 'fill in every date and time';
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
      toast.success(event ? 'Event updated' : 'Event created as a draft');
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={event ? 'Edit event' : 'Create event'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="event-form" loading={saving}>{event ? 'Save changes' : 'Create draft'}</Button>
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
  const [action, setAction] = useState(null);
  const [working, setWorking] = useState(false);
  const q = useDebounce(search);

  const { data, meta, loading, error, reload } = useFetch(
    () => eventsApi.list({ q: q || undefined, status: status || undefined, page, pageSize: 12 }),
    [q, status, page],
  );

  const runAction = async () => {
    setWorking(true);
    try {
      if (action.kind === 'publish') await eventsApi.publish(action.event.id);
      else await eventsApi.setStatus(action.event.id, action.kind === 'complete' ? 'COMPLETED' : 'CANCELLED');
      toast.success(`${action.event.title}: ${action.verb}`);
      setAction(null);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Event',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500">{row.venue}</p>
        </div>
      ),
    },
    { key: 'startAt', header: 'Starts', render: (row) => formatDateTime(row.startAt) },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    {
      key: 'seats',
      header: 'Booked',
      className: 'tabular-nums',
      render: (row) => `${row.bookedCount ?? 0} / ${row.capacity}`,
    },
    {
      key: 'price',
      header: 'Member / non-member',
      className: 'tabular-nums',
      render: (row) => `${formatCurrency(row.memberPrice)} / ${formatCurrency(row.nonMemberPrice)}`,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Link to={`/admin/events/${row.id}/bookings`}>
            <Button size="sm" variant="secondary" icon={LuList}>Bookings</Button>
          </Link>
          {row.status === 'DRAFT' && (
            <Button size="sm" icon={LuSend} onClick={() => setAction({ kind: 'publish', event: row, verb: 'published' })}>Publish</Button>
          )}
          {row.status === 'PUBLISHED' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'complete', event: row, verb: 'marked completed' })}>Complete</Button>
              <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'cancel', event: row, verb: 'cancelled' })}>Cancel</Button>
            </>
          )}
          {row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && (
            <Button size="sm" variant="ghost" icon={LuPencil} aria-label={`Edit ${row.title}`} onClick={() => setFormState({ event: row })} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Create, publish and manage club events."
        actions={<Button icon={LuPlus} onClick={() => setFormState({ event: null })}>Create event</Button>}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input aria-label="Search events" className="[&_input]:pl-9" placeholder="Search events" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select
            aria-label="filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            placeholder="All statuses"
            options={EVENT_STATUSES.map((value) => ({ value, label: humanize(value) }))}
          />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={data}
              loading={loading}
              emptyIcon={LuCalendar}
              emptyTitle="No events yet"
              emptyMessage="Create the first event to start selling tickets."
              emptyAction={<Button icon={LuPlus} onClick={() => setFormState({ event: null })}>Create event</Button>}
            />
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </Card>

      {formState && (
        <EventForm event={formState.event} onClose={() => setFormState(null)} onSaved={() => { setFormState(null); reload(); }} />
      )}
      <ConfirmDialog
        open={Boolean(action)}
        title={action ? `${humanize(action.kind)} event` : ''}
        message={
          action?.kind === 'publish'
            ? `Publish "${action?.event.title}"? It becomes visible to everyone and booking opens at the scheduled time.`
            : `This will mark "${action?.event.title}" as ${action?.verb}.`
        }
        confirmLabel={action ? humanize(action.kind) : 'Confirm'}
        variant={action?.kind === 'cancel' ? 'danger' : 'primary'}
        loading={working}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
    </>
  );
}
