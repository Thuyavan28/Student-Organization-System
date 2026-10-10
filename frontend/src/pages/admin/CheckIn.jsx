import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LuSquareCheck,
  LuKey,
  LuCalendar,
  LuMapPin,
  LuUsers,
  LuSearch,
  LuClipboard,
  LuHistory,
  LuCircleCheck,
  LuCircleX,
  LuTriangleAlert,
  LuRefreshCw,
} from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { checkinsApi } from '../../api/checkins.api';
import { eventsApi } from '../../api/events.api';
import QrScanner from '../../components/feature/QrScanner';
import ScanResultPanel from '../../components/feature/ScanResultPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { formatDateTime } from '../../utils/formatDate';

const AUTO_DISMISS_MS = 3500;

export default function CheckIn() {
  const toast = useToast();
  const [eventId, setEventId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [result, setResult] = useState(null);
  const [counter, setCounter] = useState(null);
  const [recent, setRecent] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'CHECKED_IN'
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const locked = useRef(false);
  const timer = useRef(null);

  const events = useFetch(() => eventsApi.list({ status: 'PUBLISHED', pageSize: 50 }), []);

  const selected = useMemo(
    () => events.data?.find((event) => String(event.id) === String(eventId)),
    [events.data, eventId],
  );

  useEffect(() => {
    if (events.data?.length && !eventId) {
      const upcoming = [...events.data].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      setEventId(String(upcoming[0].id));
    }
  }, [events.data, eventId]);

  // Load event stats and bookings roster when eventId changes
  const loadEventData = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoadingBookings(true);
      const [statsRes, bookingsRes] = await Promise.allSettled([
        eventsApi.stats(id),
        eventsApi.bookings(id, { pageSize: 100 }),
      ]);

      if (statsRes.status === 'fulfilled') {
        const body = statsRes.value;
        setCounter({ checkedIn: body.data.checkIns, booked: body.data.registrations });
      }
      if (bookingsRes.status === 'fulfilled') {
        const data = bookingsRes.value?.data || bookingsRes.value?.items || bookingsRes.value || [];
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (eventId) {
      loadEventData(eventId);
    }
  }, [eventId, loadEventData]);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setResult(null);
    locked.current = false;
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const verify = useCallback(
    async (token) => {
      const cleaned = token?.trim();
      if (!cleaned || !eventId || locked.current) return;
      locked.current = true;
      setVerifying(true);
      try {
        const body = await checkinsApi.verify({ eventId: Number(eventId), token: cleaned });
        const data = body.data;
        setResult(data);
        if (data.counter) {
          setCounter(data.counter);
        } else {
          // Refresh stats
          eventsApi.stats(eventId).then((r) => {
            setCounter({ checkedIn: r.data.checkIns, booked: r.data.registrations });
          }).catch(() => {});
        }

        // Refresh bookings roster
        eventsApi.bookings(eventId, { pageSize: 100 }).then((res) => {
          const list = res?.data || res?.items || res || [];
          setBookings(Array.isArray(list) ? list : []);
        }).catch(() => {});

        setRecent((current) => [
          {
            at: new Date(),
            result: data.result,
            name: data.attendee?.name ?? 'Unknown ticket',
            email: data.attendee?.email,
          },
          ...current,
        ].slice(0, 10));

        if (data.result === 'VALID') {
          toast.success(`Verified: ${data.attendee?.name || 'Attendee'} checked in!`);
        } else if (data.result === 'ALREADY_CHECKED_IN') {
          toast.error(`Already checked in: ${data.attendee?.name || 'Attendee'}`);
        } else {
          toast.error(`Ticket status: ${data.result}`);
        }

        navigator.vibrate?.(data.result === 'VALID' ? 80 : [120, 60, 120]);
        timer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      } catch (error) {
        locked.current = false;
        toast.error(apiErrorMessage(error));
      } finally {
        setVerifying(false);
      }
    },
    [eventId, dismiss, toast],
  );

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    verify(manualToken);
    setManualToken('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualToken(text.trim());
        toast.success('Pasted from clipboard');
      }
    } catch {
      toast.error('Unable to access clipboard. Please paste manually.');
    }
  };

  // Find a valid un-checked-in ticket for demo/sample testing
  const sampleTicket = useMemo(() => {
    const unChecked = bookings.find((b) => b.ticketToken && !b.checkedInAt && b.status === 'CONFIRMED');
    return unChecked?.ticketToken || bookings[0]?.ticketToken || null;
  }, [bookings]);

  // Filtered attendees for the roster table
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const name = b.user?.name?.toLowerCase() || '';
      const email = b.user?.email?.toLowerCase() || '';
      const q = attendeeSearch.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || email.includes(q);

      const isCheckedIn = Boolean(b.checkedInAt);
      if (attendeeFilter === 'CHECKED_IN') return matchesSearch && isCheckedIn;
      if (attendeeFilter === 'PENDING') return matchesSearch && !isCheckedIn;
      return matchesSearch;
    });
  }, [bookings, attendeeSearch, attendeeFilter]);

  if (events.loading) return <Skeleton className="mx-auto h-96 w-full max-w-4xl" />;
  if (events.error) return <ErrorState message={events.error} onRetry={events.reload} />;
  if (!events.data?.length) {
    return (
      <EmptyState
        icon={LuSquareCheck}
        title="No published events"
        message="Check-in is available once an event is published."
      />
    );
  }

  const checkedInCount = counter?.checkedIn ?? 0;
  const bookedCount = counter?.booked ?? selected?.bookedCount ?? 0;
  const remainingCount = Math.max(0, bookedCount - checkedInCount);
  const percentCheckedIn = bookedCount > 0 ? Math.round((checkedInCount / bookedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Check-In Desk"
        subtitle="Scan attendee QR tickets, verify registrations, or check in attendees manually."
        actions={
          <div className="w-full sm:w-80">
            <Select
              id="event-picker"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              options={events.data.map((event) => ({
                value: String(event.id),
                label: `${event.title} (${new Date(event.startAt).toLocaleDateString()})`,
              }))}
            />
          </div>
        }
      />

      {/* Selected Event Info Card */}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-cf-fg">{selected.title}</h2>
              <Badge tone="green">Live Check-In</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-cf-muted">
              <span className="flex items-center gap-1">
                <LuCalendar className="h-3.5 w-3.5" />
                {formatDateTime(selected.startAt)}
              </span>
              {selected.location && (
                <span className="flex items-center gap-1">
                  <LuMapPin className="h-3.5 w-3.5" />
                  {selected.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <LuUsers className="h-3.5 w-3.5" />
                Capacity: {selected.capacity ?? 'Unlimited'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => loadEventData(eventId)}
              icon={LuRefreshCw}
            >
              Refresh Stats
            </Button>
          </div>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-cf-fg">Checked In</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-stat-value tabular-nums text-cf-fg">{checkedInCount}</p>
            <LuCircleCheck className="h-5 w-5 text-cf-fg" />
          </div>
          <p className="mt-1 text-xs text-cf-muted">Verified attendees</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-cf-fg">Total Booked</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-stat-value tabular-nums text-cf-fg">{bookedCount}</p>
            <LuUsers className="h-5 w-5 text-cf-muted" />
          </div>
          <p className="mt-1 text-xs text-cf-muted">Confirmed seats</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-cf-fg">Remaining</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-stat-value tabular-nums text-cf-fg">{remainingCount}</p>
            <span className="text-xs font-medium text-amber-600">Pending</span>
          </div>
          <p className="mt-1 text-xs text-cf-muted">Yet to arrive</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-cf-fg">Turnout Rate</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-stat-value tabular-nums text-cf-fg">{percentCheckedIn}%</p>
            <span className="text-xs text-cf-muted">{checkedInCount}/{bookedCount}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cf-subtle">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentCheckedIn}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: QR Scanner & Manual Input */}
        <div className="space-y-6 lg:col-span-5">
          {/* Scanner Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cf-fg">QR Code Camera Scanner</h3>
              {sampleTicket && (
                <button
                  type="button"
                  onClick={() => verify(sampleTicket)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                >
                  Quick test ticket
                </button>
              )}
            </div>

            {eventId && (
              <QrScanner
                key={eventId}
                onScan={verify}
                sampleToken={sampleTicket}
              />
            )}

            {verifying && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-cf-subtle p-2 text-xs font-medium text-cf-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Verifying ticket credentials...
              </div>
            )}
          </div>

          {/* Manual Code Input Card */}
          <Card
            title="Manual Ticket Code Entry"
            subtitle="Type or paste the ticket code if the QR code is damaged or unreadable."
          >
            <div className="p-4 sm:p-5">
              <form onSubmit={submitManual} className="space-y-3">
                <div className="relative">
                  <Input
                    className="w-full pr-20 font-mono text-sm uppercase tracking-wider"
                    aria-label="Ticket code"
                    placeholder="e.g. 24f8be2b198d..."
                    autoComplete="off"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-cf-muted hover:bg-cf-subtle transition-colors"
                    title="Paste from clipboard"
                  >
                    <LuClipboard className="h-3.5 w-3.5" />
                    Paste
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-cf-muted">
                    Supports hex tokens, booking ticket IDs, and raw QR strings
                  </p>
                  <Button
                    type="submit"
                    icon={LuKey}
                    disabled={!manualToken.trim() || verifying}
                    loading={verifying}
                  >
                    Check In
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* Recent Scans Activity */}
          {recent.length > 0 && (
            <Card
              title="Recent Scans"
              subtitle="Latest check-in attempts during this session"
            >
              <div className="divide-y divide-cf-divider p-2 text-sm max-h-64 overflow-y-auto">
                {recent.map((item, index) => {
                  const isValid = item.result === 'VALID';
                  return (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-cf-subtle transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-medium text-cf-fg">{item.name}</p>
                        <p className="text-[11px] text-cf-muted">
                          {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                      <Badge tone={isValid ? 'green' : item.result === 'WRONG_EVENT' ? 'amber' : 'red'}>
                        {item.result.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Live Attendee Roster & 1-Click Door Check-In */}
        <div className="space-y-4 lg:col-span-7">
          <Card
            title="Attendee Roster & 1-Click Check-In"
            subtitle="Search attendees and mark attendance directly if ticket is unavailable."
            action={
              <span className="text-xs font-semibold text-cf-muted">
                {bookings.length} registered
              </span>
            }
          >
            {/* Search & Filter Bar */}
            <div className="border-b border-cf-divider p-4 space-y-3 bg-cf-subtle">
              <div className="relative">
                <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cf-muted" />
                <input
                  type="text"
                  placeholder="Search attendee by name or email..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  className="w-full rounded-xl border border-cf-divider bg-white py-2 pl-9 pr-4 text-sm text-cf-fg placeholder:text-cf-muted focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    attendeeFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-cf-divider text-cf-muted hover:bg-cf-subtle'
                  }`}
                >
                  All ({bookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('PENDING')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    attendeeFilter === 'PENDING'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-cf-divider text-cf-muted hover:bg-cf-subtle'
                  }`}
                >
                  Pending ({remainingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('CHECKED_IN')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    attendeeFilter === 'CHECKED_IN'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-cf-divider text-cf-muted hover:bg-cf-subtle'
                  }`}
                >
                  Checked In ({checkedInCount})
                </button>
              </div>
            </div>

            {/* Attendee List Table */}
            <div className="overflow-x-auto max-h-[32rem]">
              {loadingBookings ? (
                <div className="p-8 text-center text-xs text-cf-muted">Loading attendees...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-cf-muted">
                  {attendeeSearch ? 'No attendees match your search query.' : 'No attendees found for this filter.'}
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-cf-subtle backdrop-blur-sm border-b border-cf-divider text-xs font-semibold text-cf-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Attendee</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cf-divider">
                    {filteredBookings.map((b) => {
                      const isChecked = Boolean(b.checkedInAt);
                      return (
                        <tr key={b.id} className="hover:bg-cf-subtle transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-cf-fg leading-tight">{b.user?.name || 'Guest'}</p>
                            <p className="text-xs text-cf-muted mt-0.5">{b.user?.email}</p>
                          </td>
                          <td className="py-3 px-4">
                            {isChecked ? (
                              <div className="space-y-0.5">
                                <Badge tone="green">Checked in</Badge>
                                <p className="text-[10px] text-cf-muted">
                                  {formatDateTime(b.checkedInAt)}
                                </p>
                              </div>
                            ) : (
                              <Badge tone="amber">Pending arrival</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isChecked ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <LuCircleCheck className="h-4 w-4" />
                                Done
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={LuSquareCheck}
                                disabled={verifying || !b.ticketToken}
                                onClick={() => b.ticketToken && verify(b.ticketToken)}
                                className="hover:border-emerald-600 hover:text-emerald-700"
                              >
                                Check In
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Full-Screen Scan Result Feedback Dialog */}
      <ScanResultPanel result={result} onDismiss={dismiss} />
    </div>
  );
}
