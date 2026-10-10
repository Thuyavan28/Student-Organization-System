// DataCard: white bordered card that wraps a table or list.
// Provides the standard header row (title + optional right-side action).
export default function DataCard({ title, subtitle, action, actions, children, className = '' }) {
  const headerAction = action || actions;
  return (
    <div className={`overflow-hidden rounded-2xl border border-cf-border bg-white transition-shadow hover:shadow-md ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between gap-4 px-6 pb-1 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-cf-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-cf-muted">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex flex-shrink-0 items-center gap-2">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// DataCard body with default padding (for non-table content).
export function DataCardBody({ children, className = '' }) {
  return <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}
