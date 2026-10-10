import { useState, useEffect, useRef } from 'react';
import { LuClock, LuLogIn, LuShieldCheck, LuRefreshCw } from 'react-icons/lu';
import Button from './Button';
import Modal from './Modal';
import { getToken, setToken } from '../../api/axiosInstance';

// Inactivity limits: 14 mins idle warning, 1 min countdown before auto logout
const IDLE_WARNING_MS = 14 * 60 * 1000;
const WARNING_COUNTDOWN_SECS = 60;

export default function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SECS);
  const [returnUrl, setReturnUrl] = useState('');
  const idleTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Reset inactivity timer on user interaction
  const resetIdleTimer = () => {
    if (isWarning || open) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (getToken()) {
      idleTimerRef.current = setTimeout(() => {
        setIsWarning(true);
        setCountdown(WARNING_COUNTDOWN_SECS);
      }, IDLE_WARNING_MS);
    }
  };

  useEffect(() => {
    const handleSessionExpired = (e) => {
      const url = e.detail?.returnUrl || window.location.pathname + window.location.search;
      setReturnUrl(url);
      setIsWarning(false);
      setOpen(true);
    };

    const handleSimulateWarning = () => {
      setIsWarning(true);
      setCountdown(WARNING_COUNTDOWN_SECS);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('session-warning-simulate', handleSimulateWarning);

    // Track user activity for idle detection
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('session-warning-simulate', handleSimulateWarning);
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [open, isWarning]);

  // Countdown timer when idle warning is active
  useEffect(() => {
    if (!isWarning) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          setIsWarning(false);
          setReturnUrl(window.location.pathname + window.location.search);
          setToken(null);
          setOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimerRef.current);
  }, [isWarning]);

  const handleStaySignedIn = () => {
    setIsWarning(false);
    resetIdleTimer();
  };

  const handleSignIn = () => {
    setToken(null);
    const next = encodeURIComponent(returnUrl || '/');
    window.location.assign(`/login?next=${next}`);
  };

  // 1. Idle Warning Modal (1-2 minutes before session expiration)
  if (isWarning) {
    return (
      <Modal
        open={true}
        onClose={handleStaySignedIn}
        title={
          <div className="flex items-center gap-2">
            <LuClock className="h-5 w-5 text-amber-500 animate-spin" />
            <span>Are you still there?</span>
          </div>
        }
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => { setIsWarning(false); setOpen(true); }} size="sm">
              Sign out now
            </Button>
            <Button onClick={handleStaySignedIn} icon={LuRefreshCw} size="sm" className="font-bold shadow-md">
              Stay signed in ({countdown}s)
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-center sm:text-left">
          <p className="text-xs text-slate-600 leading-relaxed">
            You have been inactive for a while. For your security, you will be automatically signed out in{' '}
            <strong className="text-amber-600">{countdown} seconds</strong> unless you continue your session.
          </p>
        </div>
      </Modal>
    );
  }

  // 2. Full Session Expired Modal (401 or Idle limit hit)
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => {}} // Cannot dismiss without logging in
      title={
        <div className="flex items-center gap-2">
          <LuClock className="h-5 w-5 text-amber-500" />
          <span>Session Expired</span>
        </div>
      }
      size="sm"
      footer={
        <div className="flex w-full justify-end">
          <Button onClick={handleSignIn} icon={LuLogIn} className="w-full font-bold shadow-md">
            Sign in again
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0 shadow-inner">
            <LuClock className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">For your security, you&apos;ve been signed out</h4>
            <p className="text-xs text-slate-500 mt-0.5">Your session reached its inactivity limit or expired.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5">
          <p className="flex items-center gap-1.5 font-bold text-slate-800">
            <LuShieldCheck className="h-4 w-4 text-emerald-600" />
            Unsaved work preserved
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            You will be redirected back to <strong>{returnUrl || 'your current page'}</strong> immediately after signing back in.
          </p>
        </div>
      </div>
    </Modal>
  );
}
