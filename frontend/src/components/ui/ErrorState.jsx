import { LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';

export default function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-cf-divider bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cf-accent/10">
        <LuTriangleAlert className="h-6 w-6 text-cf-accent" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-cf-fg">{title}</h3>
      {error && <p className="mb-6 max-w-xs text-xs text-cf-muted">{error}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-cf-border bg-white px-4 py-2 text-sm font-medium text-cf-fg hover:bg-cf-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
        >
          <LuRefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
