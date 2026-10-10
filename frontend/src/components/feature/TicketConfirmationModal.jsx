import { Link } from 'react-router-dom';
import { LuCircleCheck, LuCalendar, LuMapPin, LuTicket } from 'react-icons/lu';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import QrTicket from './QrTicket';
import { formatDateTime } from '../../utils/formatDate';

export default function TicketConfirmationModal({
  open,
  onClose,
  bookingData,
  event,
}) {
  if (!open || !bookingData) return null;

  const ticket = bookingData.ticket || bookingData.booking?.ticket;
  const booking = bookingData.booking || bookingData;
  const token = ticket?.token || `TKT-${booking?.id}`;

  return (
    <Modal
      open={open}
      title="Booking Confirmed"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Link to="/me/tickets">
            <Button icon={LuTicket}>
              View in My Tickets
            </Button>
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <LuCircleCheck className="h-6 w-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-cf-fg">{event?.title || 'Event Ticket'}</h3>
          <p className="text-xs text-cf-muted mt-0.5">Your seat is reserved! Here is your entrance pass:</p>
        </div>

        {/* QR Ticket */}
        <div className="w-full rounded-2xl border border-cf-border bg-white p-3.5 shadow-sm flex flex-col items-center">
          <QrTicket token={token} fileName={`ticket-${event?.title?.toLowerCase().replace(/\s+/g, '-') || 'event'}`} />
          
          {bookingData?.verificationCode && (
            <div className="mt-3 w-full rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Verification Code</span>
              <p className="font-mono text-base font-extrabold text-emerald-950 mt-0.5">{bookingData.verificationCode}</p>
            </div>
          )}

          <p className="mt-2 font-mono text-[10px] text-cf-muted max-w-[13rem] break-all">{token}</p>
        </div>

        {event && (
          <div className="w-full rounded-xl bg-cf-subtle p-3 text-left space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-cf-muted">
              <LuCalendar className="h-3.5 w-3.5 text-cf-fg shrink-0" />
              <span className="font-medium text-cf-fg">{formatDateTime(event.startAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-cf-muted">
              <LuMapPin className="h-3.5 w-3.5 text-cf-fg shrink-0" />
              <span className="font-medium text-cf-fg">{event.venue}</span>
            </div>
          </div>
        )}

        <p className="text-[11px] text-cf-muted">
          Present this QR code at the door for check-in. It has also been saved to your account.
        </p>
      </div>
    </Modal>
  );
}
