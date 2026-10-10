import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare, FiKey } from 'react-icons/fi';
import { apiErrorMessage } from '../../api/axiosInstance';
import { checkinsApi } from '../../api/checkins.api';
import { eventsApi } from '../../api/events.api';
import QrScanner from '../../components/feature/QrScanner';
import ScanResultPanel from '../../components/feature/ScanResultPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
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
  const locked = useRef(false);
  const timer = useRef(null);

  const events = useFetch(() => eventsApi.list({ status: 'PUBLISHED', pageSize: 50 }), []);
  const selected = useMemo(() => events.data?.find((event) => String(event.id) === eventId), [events.data, eventId]);

  useEffect(() => {
    if (events.data?.length && !eventId) {
      const upcoming = [...events.data].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      setEventId(String(upcoming[0].id));
    }
  }, [events.data, eventId]);

  useEffect(() => {
    setCounter(null);
    if (!eventId) return;
    eventsApi
      .stats(eventId)
      .then((body) => setCounter({ checkedIn: body.data.checkIns, booked: body.data.registrations }))
      .catch(() => {});
  }, [eventId]);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setResult(null);
    locked.current = false;
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const verify = useCallback(
    async (token) => {
      const cleaned = token.trim();
      if (!cleaned || !eventId || locked.current) return;
      locked.current = true;
      setVerifying(true);
      try {
        const body = await checkinsApi.verify({ eventId: Number(eventId), token: cleaned });
        const data = body.data;
        setResult(data);
        if (data.counter) setCounter(data.counter);
        setRecent((current) => [{ at: new Date(), result: data.result, name: data.attendee?.name ?? 'Unknown ticket' }, ...current].slice(0, 6));
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

  const submitManual = (event) => {
    event.preventDefault();
    verify(manualToken);
    setManualToken('');
  };

  if (events.loading) return <Skeleton className="mx-auto h-96 w-full max-w-md" />;
  if (events.error) return <ErrorState message={events.error} onRetry={events.reload} />;
  if (!events.data?.length) {
    return <EmptyState icon={FiCheckSquare} title="No published events" message="Check-in is available once an event is published." />;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Check-in</h1>

      <Select
        label="Event"
        value={eventId}
        onChange={(event) => setEventId(event.target.value)}
        options={events.data.map((event) => ({ value: event.id, label: `${event.title} - ${formatDateTime(event.startAt)}` }))}
      />

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-3xl font-bold tabular-nums text-emerald-700">{counter?.checkedIn ?? '-'}</p>
          <p className="text-xs text-slate-500">Checked in</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-3xl font-bold tabular-nums text-slate-900">{counter?.booked ?? selected?.bookedCount ?? '-'}</p>
          <p className="text-xs text-slate-500">Booked</p>
        </div>
      </div>

      {eventId && <QrScanner key={eventId} onScan={verify} />}
      {verifying && <p className="text-center text-sm text-slate-500" role="status">Checking ticket...</p>}

      <Card title="Enter ticket code manually">
        <form onSubmit={submitManual} className="flex items-end gap-2">
          <Input
            className="flex-1"
            aria-label="Ticket code"
            placeholder="Paste or type the ticket code"
            autoComplete="off"
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
          />
          <Button type="submit" icon={FiKey} disabled={!manualToken.trim()}>Check</Button>
        </form>
      </Card>

      {recent.length > 0 && (
        <Card title="Recent scans">
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((item, index) => (
              <li key={index} className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-900">{item.name}</span>
                <Badge tone={item.result === 'VALID' ? 'green' : 'red'}>{item.result.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ScanResultPanel result={result} onDismiss={dismiss} />
    </div>
  );
}
