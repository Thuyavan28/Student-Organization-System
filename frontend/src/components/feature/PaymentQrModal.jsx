import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  LuQrCode,
  LuCopy,
  LuCheck,
  LuShieldCheck,
  LuSmartphone,
  LuCircleCheck,
  LuCircleX,
  LuExternalLink,
  LuRefreshCw,
  LuWifi,
} from 'react-icons/lu';
import { paymentsApi } from '../../api/payments.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { formatCurrency } from '../../utils/formatCurrency';

export default function PaymentQrModal({
  open,
  onClose,
  title = 'Scan & Pay',
  amount = 0,
  payeeName = 'ClubFlow Skyline',
  upiId = 'clubflow@skyline',
  note = 'Event Ticket',
  onConfirm,
  confirmLabel = 'I have paid — Complete booking',
  loading = false,
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('mobile'); // 'mobile' | 'upi'
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [status, setStatus] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [lanIp, setLanIp] = useState('172.17.52.183');
  const [availableIps, setAvailableIps] = useState([]);
  const pollTimerRef = useRef(null);

  // Clear polling on unmount or close
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Initialize payment session and get LAN IP
  const initSession = async () => {
    if (amount <= 0) return;
    try {
      setSessionLoading(true);
      setStatus('PENDING');
      stopPolling();

      // Detect LAN IP
      try {
        const ipRes = await paymentsApi.getLanIp();
        if (ipRes.data?.ips?.length) {
          setAvailableIps(ipRes.data.ips);
        }
        if (ipRes.data?.ip && ipRes.data.ip !== 'localhost') {
          setLanIp(ipRes.data.ip);
        } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          setLanIp(window.location.hostname);
        }
      } catch {
        // Fallback to current host or detected IP
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          setLanIp(window.location.hostname);
        }
      }

      // Create session
      const sessRes = await paymentsApi.createSession({
        amount,
        title,
        note,
        payeeName,
        type: 'PAYMENT',
      });
      const newSession = sessRes.data;
      setSession(newSession);

      // Start polling for mobile approval
      pollTimerRef.current = setInterval(async () => {
        try {
          const checkRes = await paymentsApi.getSession(newSession.id);
          const currentStatus = checkRes.data.status;
          if (currentStatus === 'APPROVED') {
            setStatus('APPROVED');
            setSession(checkRes.data);
            stopPolling();
            // Automatically complete booking after short visual confirmation
            setTimeout(() => {
              if (onConfirm) onConfirm({ verificationCode: checkRes.data.verificationCode, sessionId: newSession.id });
            }, 1200);
          } else if (currentStatus === 'REJECTED') {
            setStatus('REJECTED');
            setSession(checkRes.data);
            stopPolling();
          }
        } catch {
          // Keep polling on transient network hiccups
        }
      }, 1500);
    } catch {
      // Session creation failed
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      initSession();
    } else {
      stopPolling();
      setSession(null);
      setStatus('PENDING');
    }
    return () => stopPolling();
  }, [open, amount, title]);

  if (!open) return null;

  const isFree = amount <= 0;
  const rupees = (amount / 100).toFixed(2);
  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${rupees}&cu=INR&tn=${encodeURIComponent(note)}`;

  // Mobile URL for phone browser
  const activeHost = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.hostname
    : lanIp;
  const mobileUrl = session?.id
    ? `http://${activeHost}:5173/pay/${session.id}`
    : '';

  const qrValue = viewMode === 'mobile' && mobileUrl ? mobileUrl : upiPayload;

  const copyUpi = () => {
    navigator.clipboard?.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMobileLink = () => {
    if (mobileUrl) {
      navigator.clipboard?.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm?.({ verificationCode: session?.verificationCode, sessionId: session?.id })}
            loading={loading || (status === 'APPROVED' && loading)}
          >
            {isFree ? 'Confirm booking' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {isFree ? (
          <div className="py-6 space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <LuShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-cf-fg">Free registration</h3>
            <p className="text-xs text-cf-muted">No payment required for this event. Click below to confirm your ticket.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-cf-muted">Amount to Pay</p>
              <p className="text-3xl font-extrabold text-cf-fg">{formatCurrency(amount)}</p>
              <p className="text-xs text-cf-muted font-medium truncate max-w-xs">{note}</p>
            </div>

            {/* Mode Selector Toggle */}
            <div className="inline-flex rounded-xl bg-cf-subtle p-1 border border-cf-divider text-xs">
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-cf-fg text-white shadow-sm'
                    : 'text-cf-muted hover:text-cf-fg'
                }`}
              >
                <LuSmartphone className="h-3.5 w-3.5" />
                <span>Mobile Scan & Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('upi')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'upi'
                    ? 'bg-cf-fg text-white shadow-sm'
                    : 'text-cf-muted hover:text-cf-fg'
                }`}
              >
                <LuQrCode className="h-3.5 w-3.5" />
                <span>UPI App</span>
              </button>
            </div>

            {/* Network Selector (if multiple adapters like Wi-Fi and Hotspot exist) */}
            {availableIps.length > 1 && viewMode === 'mobile' && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-cf-muted pt-0.5">
                <span>Select phone network:</span>
                {availableIps.map((item) => (
                  <button
                    key={item.ip}
                    type="button"
                    onClick={() => setLanIp(item.ip)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      lanIp === item.ip
                        ? 'bg-cf-fg text-white font-bold'
                        : 'bg-cf-subtle hover:bg-cf-hover text-cf-fg border border-cf-border'
                    }`}
                  >
                    {item.ip} ({item.interface.toLowerCase().includes('local') ? 'Hotspot' : 'Wi-Fi/LAN'})
                  </button>
                ))}
              </div>
            )}

            {/* QR Code Container */}
            <div className="relative rounded-2xl border-2 border-dashed border-cf-border bg-white p-4 shadow-sm flex flex-col items-center min-w-[220px]">
              {sessionLoading ? (
                <div className="h-[190px] w-[190px] flex flex-col items-center justify-center space-y-2">
                  <Spinner className="h-8 w-8 text-cf-fg" />
                  <span className="text-xs text-cf-muted">Preparing secure QR...</span>
                </div>
              ) : status === 'APPROVED' ? (
                <div className="h-[190px] w-[190px] flex flex-col items-center justify-center space-y-2.5 bg-emerald-50/60 rounded-xl p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <LuCircleCheck className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-emerald-800">Payment Approved!</p>
                  <p className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Code: {session?.verificationCode}
                  </p>
                </div>
              ) : status === 'REJECTED' ? (
                <div className="h-[190px] w-[190px] flex flex-col items-center justify-center space-y-2.5 bg-red-50/60 rounded-xl p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <LuCircleX className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-red-800">Payment Rejected</p>
                  <button
                    type="button"
                    onClick={initSession}
                    className="flex items-center gap-1 text-xs font-medium text-red-700 underline"
                  >
                    <LuRefreshCw className="h-3 w-3" />
                    <span>Generate new QR</span>
                  </button>
                </div>
              ) : (
                <>
                  <QRCodeCanvas
                    value={qrValue}
                    size={180}
                    level="M"
                    marginSize={1}
                    className="rounded-lg"
                  />
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-cf-muted">
                    {viewMode === 'mobile' ? (
                      <>
                        <LuWifi className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Scan with phone camera on same Wi-Fi</span>
                      </>
                    ) : (
                      <>
                        <LuSmartphone className="h-3.5 w-3.5 text-cf-fg" />
                        <span>Scan with GPay, PhonePe, Paytm or UPI</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Live Status Banner */}
            {status === 'PENDING' && viewMode === 'mobile' && session && (
              <div className="w-full flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200/60 px-3 py-2 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Waiting for mobile approval...</span>
                </div>
                <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-semibold text-emerald-900 hover:underline"
                  title="Test approval page on laptop"
                >
                  <span>Preview</span>
                  <LuExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Details Box */}
            <div className="w-full rounded-xl bg-cf-subtle p-3 text-left">
              {viewMode === 'mobile' ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-cf-muted">Mobile URL:</span>
                    <button
                      type="button"
                      onClick={copyMobileLink}
                      className="flex items-center gap-1 font-mono text-[11px] text-cf-fg hover:text-cf-accent transition-colors"
                      title="Copy URL"
                    >
                      <span className="truncate max-w-[170px]">{mobileUrl}</span>
                      {copied ? <LuCheck className="h-3 w-3 text-emerald-600" /> : <LuCopy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-cf-muted text-[11px]">
                    <span>Local LAN:</span>
                    <span className="font-mono text-cf-fg">{activeHost}:5173</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-cf-muted">UPI ID:</span>
                    <button
                      type="button"
                      onClick={copyUpi}
                      className="flex items-center gap-1 font-mono font-medium text-cf-fg hover:text-cf-accent transition-colors"
                      title="Copy UPI ID"
                    >
                      <span>{upiId}</span>
                      {copied ? <LuCheck className="h-3.5 w-3.5 text-emerald-600" /> : <LuCopy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-cf-muted">
                    <span>Account:</span>
                    <span className="font-medium text-cf-fg">{payeeName}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-cf-muted leading-relaxed">
              {viewMode === 'mobile'
                ? 'Scan the QR with your phone. A popup card will open to approve or reject. Once approved, the ticket is generated automatically.'
                : 'Once you have completed payment on your mobile app, tap confirm below. Your ticket and entrance QR will be generated immediately.'}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
