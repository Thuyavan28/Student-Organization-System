export default function StatCard({ label, value, sub, icon: Icon, tone }) {
  const toneClass = {
    default: 'text-cf-fg',
    success: 'text-cf-success',
    warning: 'text-cf-warning',
    danger:  'text-cf-accent',
    pending: 'text-cf-pending',
  }[tone || 'default'];

  // Ensure numerical format is always displayed instead of '-'
  const displayValue = (() => {
    if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '0';
    if (value === null || value === undefined || value === '' || value === '-') return '0';
    return value;
  })();

  return (
    <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-cf-fg">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${tone && tone !== 'default' ? toneClass : 'text-cf-fg'}`} aria-hidden="true" />}
      </div>
      <p className={`text-stat-value tabular-nums ${toneClass}`}>{displayValue}</p>
      {sub && <p className="mt-1 text-xs text-cf-muted">{sub}</p>}
    </div>
  );
}
