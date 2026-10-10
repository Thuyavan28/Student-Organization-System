import { useState, useEffect } from 'react';
import { LuGraduationCap, LuRefreshCw, LuArrowLeft } from 'react-icons/lu';
import Skeleton from './Skeleton';
import Button from './Button';

export default function PageLoader({
  message = 'Loading workspace...',
  isColdStart = false,
  onRetry,
  onCancel,
  forceSlowWarning = false,
}) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(forceSlowWarning);

  useEffect(() => {
    if (forceSlowWarning) {
      setShowSkeleton(true);
      setShowSlowWarning(true);
      return;
    }

    // 150ms anti-flicker delay before showing heavy skeleton
    const flickerTimer = setTimeout(() => setShowSkeleton(true), 150);

    // 8.5s timeout warning for slow connection
    const slowTimer = setTimeout(() => setShowSlowWarning(true), 8500);

    return () => {
      clearTimeout(flickerTimer);
      clearTimeout(slowTimer);
    };
  }, [forceSlowWarning]);

  if (!showSkeleton) return null;

  const handleRetry = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else window.location.href = '/';
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 animate-pulse" aria-busy="true" aria-live="polite">
      {/* Brand mark & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <LuGraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">ClubFlow</span>
            <p className="text-[11px] text-slate-400 font-medium">{message}</p>
          </div>
        </div>

        {/* Slow connection hint after 8.5s */}
        {showSlowWarning && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 animate-slide-in">
            <span>Taking longer than usual.</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:no-underline"
            >
              <LuRefreshCw className="h-3 w-3" /> Retry
            </button>
            <span className="text-amber-400">|</span>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 text-amber-700 hover:underline"
            >
              <LuArrowLeft className="h-3 w-3" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Simulated Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-5 w-5 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="space-y-2.5 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
