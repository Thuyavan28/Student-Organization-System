import { LuTriangleAlert, LuCircleCheck, LuCircleX } from 'react-icons/lu';
import { formatDateTime } from '../../utils/formatDate';

const VARIANTS = {
  VALID: { icon: LuCircleCheck, bg: 'bg-emerald-600', title: 'Checked in', note: 'Valid ticket' },
  ALREADY_USED: { icon: LuCircleX, bg: 'bg-red-600', title: 'Already checked in', note: 'This ticket was scanned before' },
  WRONG_EVENT: { icon: LuTriangleAlert, bg: 'bg-amber-600', title: 'Wrong event', note: 'This ticket is for a different event' },
  INVALID: { icon: LuCircleX, bg: 'bg-red-600', title: 'Invalid ticket', note: 'No ticket matches this code' },
  CANCELLED: { icon: LuCircleX, bg: 'bg-red-600', title: 'Ticket cancelled', note: 'This booking was cancelled' },
};

export default function ScanResultPanel({ result, onDismiss }) {
  if (!result) return null;
  const variant = VARIANTS[result.result] ?? VARIANTS.INVALID;
  const Icon = variant.icon;
  const membership = result.membership;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white ${variant.bg}`}
      role="alertdialog"
      aria-live="assertive"
      aria-label={variant.title}
      onClick={onDismiss}
    >
      <Icon className="mb-4 h-24 w-24" aria-hidden="true" />
      <h2 className="text-4xl font-bold">{variant.title}</h2>
      <p className="mt-2 text-lg text-white/90">{variant.note}</p>

      {result.attendee && (
        <div className="mt-8 rounded-2xl bg-white/15 px-6 py-4">
          <p className="text-2xl font-semibold">{result.attendee.name}</p>
          {membership && (
            <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900">
              {membership.isActive ? `Active member${membership.tier ? ` - ${membership.tier}` : ''}` : 'Not an active member'}
            </p>
          )}
        </div>
      )}

      {result.result === 'ALREADY_USED' && result.checkedInAt && (
        <p className="mt-4 text-lg">first scanned at {formatDateTime(result.checkedInAt)}</p>
      )}
      {result.counter && (
        <p className="mt-6 text-sm text-white/80">
          {result.counter.checkedIn} of {result.counter.booked} checked in
        </p>
      )}
      <p className="mt-10 text-sm text-white/70">Tap anywhere to scan the next ticket</p>
    </div>
  );
}
