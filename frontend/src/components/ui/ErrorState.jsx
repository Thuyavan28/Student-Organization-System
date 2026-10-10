import { useState } from 'react';
import { LuTriangleAlert, LuRefreshCw, LuChevronDown, LuChevronUp, LuHouse, LuArrowLeft, LuCopy, LuCheck } from 'react-icons/lu';
import Button from './Button';

export default function ErrorState({
  error,
  message,
  onRetry,
  title = 'Something went wrong',
  code,
  inline = false,
  className = '',
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayMessage =
    message ||
    (typeof error === 'string'
      ? error
      : error?.message || 'We encountered an unexpected issue while loading this content.');

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
      setRetryCount((c) => c + 1);
    } catch {
      setRetryCount((c) => c + 1);
    } finally {
      setRetrying(false);
    }
  };

  const copyDetails = () => {
    const details = `Error: ${displayMessage}\nCode: ${code || 'N/A'}\nTime: ${new Date().toISOString()}`;
    navigator.clipboard?.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If retried 3 times without success, adapt the copy
  const isHighRetry = retryCount >= 3;

  if (inline) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-2.5">
          <LuTriangleAlert className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{displayMessage}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 shrink-0 rounded-lg bg-white border border-rose-200 px-2.5 py-1 font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-sm disabled:opacity-50"
          >
            <LuRefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm ${className}`}
      role="alert"
    >
      {/* Alert Icon Capsule */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-inner">
        <LuTriangleAlert className="h-7 w-7" />
      </div>

      <h3 className="mb-1 text-base font-bold text-slate-900">
        {isHighRetry ? 'Unable to complete request' : title}
      </h3>

      <p className="mb-6 max-w-sm text-xs text-slate-500 leading-relaxed">
        {isHighRetry
          ? 'We tried reconnecting multiple times. The service might be temporarily unavailable or under maintenance. Please try again later or return to home.'
          : displayMessage}
      </p>

      {/* Primary & Secondary Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {onRetry && (
          <Button
            onClick={handleRetry}
            loading={retrying}
            icon={LuRefreshCw}
            className="shadow-sm"
          >
            {retrying ? 'Retrying...' : 'Try again'}
          </Button>
        )}

        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <LuArrowLeft className="h-3.5 w-3.5" /> Go back
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <LuHouse className="h-3.5 w-3.5" /> Home
        </button>
      </div>

      {/* Collapsed Technical Details Accordion */}
      <div className="mt-6 w-full max-w-sm border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
          {showDetails ? <LuChevronUp className="h-3 w-3" /> : <LuChevronDown className="h-3 w-3" />}
        </button>

        {showDetails && (
          <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-left font-mono text-[10px] text-slate-600">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
              <span className="font-bold text-slate-500">Diagnostic Info</span>
              <button
                type="button"
                onClick={copyDetails}
                className="flex items-center gap-0.5 text-slate-500 hover:text-slate-800"
              >
                {copied ? <LuCheck className="h-3 w-3 text-emerald-600" /> : <LuCopy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="break-all">{displayMessage}</p>
            {code && <p className="text-slate-500 mt-1">Code: {code}</p>}
            <p className="text-slate-400 mt-1">Timestamp: {new Date().toLocaleTimeString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
