import { LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';

export default function PartialDataBanner({
  message = "Some sections of this page couldn't be loaded.",
  onRetry,
  staleSince,
  className = '',
}) {
  return (
    <aside
      aria-label="Partial data warning"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 ${className}`}
    >
      <div className="flex items-center gap-2">
        <LuTriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="font-medium">{message}</span>
        {staleSince && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Showing cached data from {staleSince}
          </span>
        )}
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
        >
          <LuRefreshCw className="h-3 w-3" /> Retry failed sections
        </button>
      )}
    </aside>
  );
}

// Inline fallback for missing individual field values (never render undefined or NaN)
export function DataValue({ value, placeholder = '—', className = '' }) {
  if (value === null || value === undefined || value === '' || Number.isNaN(value)) {
    return <span className={`text-slate-400 font-normal ${className}`}>{placeholder}</span>;
  }
  return <span className={className}>{value}</span>;
}
