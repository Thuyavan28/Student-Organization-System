import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

export default function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;

  return (
    <div className="flex items-center justify-between border-t border-cf-divider px-6 py-4">
      <p className="text-xs text-cf-muted">
        Page {page} of {totalPages}
        {meta.total != null && <> &middot; {meta.total} total</>}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-cf-divider text-cf-muted hover:bg-cf-hover hover:text-cf-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <LuChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-cf-divider text-cf-muted hover:bg-cf-hover hover:text-cf-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <LuChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
