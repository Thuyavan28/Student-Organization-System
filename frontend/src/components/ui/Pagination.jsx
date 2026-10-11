import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

// Page numbers to show: always the first and last page and the pages around the current one, with "..." for the gaps,
// e.g. 1 ... 4 [5] 6 ... 21. Seven pages or fewer are all shown.
export function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => keep.add(n));
  const sorted = [...keep].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg focus-visible:ring-offset-1';

// Numbered pagination with a "Showing 11-20 of 210" label. Pages call it with `onChange` or `onPage`; both work.
export default function Pagination({ meta, onChange, onPage }) {
  const go = onChange ?? onPage;
  if (!meta || meta.totalPages <= 1 || !go) return null;
  const { page, totalPages, pageSize, total } = meta;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total ?? page * pageSize);

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-cf-divider px-4 py-4 sm:flex-row sm:px-6">
      <p className="text-sm text-cf-muted" aria-live="polite">
        {total != null ? (
          <>
            Showing <span className="font-semibold text-cf-fg tabular-nums">{from}-{to}</span> of{' '}
            <span className="font-semibold text-cf-fg tabular-nums">{total}</span>
          </>
        ) : (
          <>Page {page} of {totalPages}</>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Previous page"
          className={`${base} gap-1 border-cf-border bg-white text-cf-fg hover:bg-cf-hover disabled:cursor-not-allowed disabled:border-cf-divider disabled:text-cf-muted disabled:opacity-50 disabled:hover:bg-white`}
        >
          <LuChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* numbers on wider screens, a compact "page X of Y" on phones */}
        <ul className="hidden items-center gap-1.5 sm:flex">
          {pageWindow(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-cf-muted">...</li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  className={`${base} tabular-nums ${item === page ? 'border-cf-fg bg-cf-fg text-white' : 'border-transparent text-cf-fg hover:border-cf-border hover:bg-cf-hover'}`}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
        <span className="px-2 text-sm text-cf-muted tabular-nums sm:hidden">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label="Next page"
          className={`${base} gap-1 border-cf-border bg-white text-cf-fg hover:bg-cf-hover disabled:cursor-not-allowed disabled:border-cf-divider disabled:text-cf-muted disabled:opacity-50 disabled:hover:bg-white`}
        >
          <span className="hidden sm:inline">Next</span>
          <LuChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
