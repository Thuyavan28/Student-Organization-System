import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  LuShieldCheck,
  LuCircleCheck,
  LuCircleX,
  LuQrCode,
  LuCopy,
  LuCheck,
  LuSmartphone,
  LuRefreshCw,
  LuArrowLeft,
  LuZap,
} from 'react-icons/lu';
import { paymentsApi } from '../../api/payments.api';
import { apiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MobilePay() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await paymentsApi.getSession(sessionId);
      setSession(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load payment session'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await paymentsApi.approve(sessionId);
      setSession(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not approve payment'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await paymentsApi.reject(sessionId);
      setSession(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reject payment'));
    } finally {
      setActionLoading(false);
    }
  };

  const copyCode = () => {
    if (session?.verificationCode) {
      navigator.clipboard?.writeText(session.verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Brand Bar */}
      <header className="flex items-center justify-between py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20">
            <LuZap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">ClubFlow Pay</span>
            <p className="text-[10px] text-slate-400">Skyline Student Association</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] text-emerald-400 border border-slate-700/60">
          <LuShieldCheck className="h-3.5 w-3.5" />
          <span>Local Wi-Fi Secure</span>
        </div>
      </header>

      {/* Main Container / Mobile Popup Card */}
      <main className="my-auto max-w-sm w-full mx-auto py-6">
        {loading ? (
          <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-8 text-center shadow-2xl backdrop-blur-xl">
            <Spinner className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-4 text-sm font-medium text-slate-200">Loading payment request...</p>
            <p className="mt-1 text-xs text-slate-400">Connecting with your laptop over local network</p>
          </div>
        ) : error && !session ? (
          <div className="rounded-3xl bg-slate-800/90 border border-red-500/30 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <LuCircleX className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">Session Unavailable</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">{error}</p>
            <div className="mt-6">
              <Button variant="secondary" onClick={fetchSession} icon={LuRefreshCw} className="w-full">
                Retry Connection
              </Button>
            </div>
          </div>
        ) : session?.status === 'APPROVED' ? (
          /* Payment Approved State */
          <div className="rounded-3xl bg-slate-800/95 border border-emerald-500/40 p-6 text-center shadow-2xl backdrop-blur-xl animate-fade-in space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-8 ring-emerald-500/5">
              <LuCircleCheck className="h-10 w-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Payment Successful
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">{formatCurrency(session.amount)}</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">{session.title}</p>
            </div>

            {/* Verification Code Box */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-700 p-4 text-left shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verification Code</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xl font-mono font-bold tracking-wider text-emerald-400">
                  {session.verificationCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
                >
                  {copied ? (
                    <>
                      <LuCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <LuCopy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Show this code or scan the ticket QR below at the entrance.
              </p>
            </div>

            {/* Ticket QR on Phone Screen */}
            <div className="rounded-2xl bg-white p-4 shadow-lg flex flex-col items-center">
              <QRCodeCanvas
                value={session.ticketQrData || session.verificationCode}
                size={160}
                level="M"
                marginSize={1}
                className="rounded-lg"
              />
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                <LuQrCode className="h-3.5 w-3.5 text-slate-900" />
                <span>Verified Ticket QR</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 p-3 text-[11px] text-slate-400 border border-slate-800">
              Sync complete: Your laptop screen has automatically moved forward to confirmation.
            </div>
          </div>
        ) : session?.status === 'REJECTED' ? (
          /* Payment Rejected State */
          <div className="rounded-3xl bg-slate-800/95 border border-red-500/40 p-6 text-center shadow-2xl backdrop-blur-xl animate-fade-in space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <LuCircleX className="h-10 w-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                Payment Cancelled
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">Transaction Rejected</h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                You chose to reject this payment request. No amount was deducted and the booking was cancelled.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={fetchSession}
                icon={LuRefreshCw}
                className="w-full text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-750"
              >
                Check Session Status
              </Button>
            </div>
          </div>
        ) : (
          /* PENDING / APPROVE OR REJECT PROMPT */
          <div className="rounded-3xl bg-slate-800/95 border border-slate-700 p-6 text-center shadow-2xl backdrop-blur-xl space-y-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <LuSmartphone className="h-3.5 w-3.5" />
                <span>Mobile Payment Request</span>
              </div>
              <h2 className="mt-3 text-3xl font-black text-white tracking-tight">{formatCurrency(session?.amount)}</h2>
              <p className="text-sm font-semibold text-slate-200 truncate">{session?.title}</p>
              {session?.note && <p className="text-xs text-slate-400 truncate">{session.note}</p>}
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 p-3.5 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-semibold text-slate-200">{session?.payeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mode:</span>
                <span className="font-medium text-emerald-400">Simulated UPI / Local Net</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Session ID:</span>
                <span className="font-mono text-slate-300">{session?.id}</span>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-300">
                {error}
              </p>
            )}

            {/* Approval / Rejection Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold py-3.5 px-4 shadow-lg shadow-emerald-500/25 transition-all text-sm disabled:opacity-50"
              >
                {actionLoading ? (
                  <Spinner className="h-4 w-4 text-slate-950" />
                ) : (
                  <>
                    <LuCircleCheck className="h-5 w-5" />
                    <span>Approve Payment ({formatCurrency(session?.amount)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 hover:bg-red-500/20 active:bg-red-500/30 text-slate-400 hover:text-red-400 border border-slate-700/80 font-medium py-3 px-4 transition-all text-xs disabled:opacity-50"
              >
                <LuCircleX className="h-4 w-4" />
                <span>Reject / Cancel Payment</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              When approved, payment confirmation and ticket verification code will be sent immediately.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-[11px] text-slate-500 border-t border-slate-800/80">
        ClubFlow Local Gateway • Connected over Wi-Fi
      </footer>
    </div>
  );
}
