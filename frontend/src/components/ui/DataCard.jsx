// DataCard: white bordered card that wraps a table or list.
// Provides the standard header row (title + optional right-side action).
export default function DataCard({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-cf-border bg-white overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-cf-divider px-6 py-4 gap-4">
          {title && <h2 className="text-sm font-semibold text-cf-fg">{title}</h2>}
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// Convenience: DataCard body with default padding (for non-table content).
export function DataCardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
