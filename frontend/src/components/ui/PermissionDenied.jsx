import { useState } from 'react';
import { LuShieldAlert, LuCameraOff, LuLock, LuHouse, LuArrowLeft, LuRefreshCw, LuUpload, LuKey } from 'react-icons/lu';
import Button from './Button';
import { useAuth } from '../../hooks/useAuth';
import { humanize, homeFor } from '../../utils/constants';

export default function PermissionDenied({
  type = 'account', // 'account' | 'device'
  deviceType = 'Camera', // 'Camera' | 'Location' | 'Microphone' | 'Files'
  requiredRole = 'ADMIN',
  onReRequest,
  onFallback,
  fallbackLabel = 'Use manual code input instead',
  className = '',
}) {
  const { user } = useAuth();
  const [accessRequested, setAccessRequested] = useState(false);

  if (type === 'device') {
    return (
      <div
        className={`mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-lg ${className}`}
        role="region"
        aria-label="Device permission required"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 shadow-inner">
          <LuCameraOff className="h-8 w-8" />
        </div>

        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
          Device Access Needed
        </span>

        <h2 className="mt-3 text-xl font-extrabold text-slate-900 tracking-tight">
          {deviceType} Permission Blocked
        </h2>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          ClubFlow requires {deviceType.toLowerCase()} access to scan student ticket QR codes instantly.
          Without it, you can still verify tickets by uploading an image or entering the ticket token manually below.
        </p>

        {/* How to enable instructions */}
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-left text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-800">To enable in your browser:</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500">
            <li>Click the lock or camera icon in the address bar.</li>
            <li>Switch <strong>{deviceType}</strong> permission to <strong>Allow</strong>.</li>
            <li>Reload the page or click &apos;Try Again&apos; below.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {onReRequest && (
            <Button onClick={onReRequest} icon={LuRefreshCw} className="font-bold shadow-sm">
              Ask Permission Again
            </Button>
          )}

          {onFallback && (
            <Button variant="secondary" onClick={onFallback} icon={LuKey} className="font-medium">
              {fallbackLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Account / Role Permission Denied (403 Forbidden)
  return (
    <div
      className={`mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl ${className}`}
      role="region"
      aria-label="Account permission restricted"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 shadow-inner">
        <LuLock className="h-8 w-8" />
      </div>

      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700">
        Access Restricted (403)
      </span>

      <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
        Permission Required
      </h2>

      <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
        This portal section requires <strong>{humanize(requiredRole)}</strong> authority. Your current account
        is signed in as <strong>{humanize(user?.role || 'MEMBER')}</strong>.
      </p>

      {/* Role explanation */}
      <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Your Account:</span>
          <span className="font-bold text-slate-900">{user?.email || 'Student'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Current Role:</span>
          <span className="font-bold text-slate-900">{humanize(user?.role || 'MEMBER')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Required Role:</span>
          <span className="font-bold text-emerald-700">{humanize(requiredRole)}</span>
        </div>
      </div>

      {/* Safe Way Back & Request Access */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => (window.location.href = user ? homeFor(user.role) : '/')}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-colors"
        >
          <LuHouse className="h-4 w-4" /> Go to My Dashboard
        </button>

        {!accessRequested ? (
          <button
            type="button"
            onClick={() => setAccessRequested(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Request Access from Admin
          </button>
        ) : (
          <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
            Request sent to club administrator
          </span>
        )}
      </div>
    </div>
  );
}
