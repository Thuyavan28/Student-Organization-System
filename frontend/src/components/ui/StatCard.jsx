export default function StatCard({ label, value, sub, icon: Icon, tone }) {
  const toneClass = {
    default: 'text-cf-fg',
    success: 'text-cf-success',
    warning: 'text-cf-warning',
    danger:  'text-cf-accent',
    pending: 'text-cf-pending',
  }[tone || 'default'];

  return (
    <div className="rounded-2xl border border-cf-border bg-white p-6">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-cf-muted">{label}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cf-subtle">
            <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${toneClass}`}>{value ?? '-'}</p>
      {sub && <p className="mt-1 text-xs text-cf-muted">{sub}</p>}
    </div>
  );
}
