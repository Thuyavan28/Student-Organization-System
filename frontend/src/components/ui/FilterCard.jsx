// FilterCard: white card that wraps filter controls (search, selects, date inputs).
// Children are laid out in a wrapping flexbox row.
export default function FilterCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-cf-border bg-white p-4 mb-6 ${className}`}>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

// Convenience wrapper so filter inputs share a consistent label + input stack.
export function FilterField({ label, htmlFor, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-cf-fg">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
