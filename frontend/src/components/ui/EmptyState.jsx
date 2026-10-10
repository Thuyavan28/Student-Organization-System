import { LuInbox } from 'react-icons/lu';
// Named re-export so existing pages can do: import { ErrorState } from './EmptyState'
export { default as ErrorState } from './ErrorState';

export default function EmptyState({ icon: Icon = LuInbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-cf-divider bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cf-subtle">
        <Icon className="h-6 w-6 text-cf-muted" aria-hidden="true" />
      </div>
      {title && <h3 className="mb-1 text-sm font-semibold text-cf-fg">{title}</h3>}
      {message && <p className="mb-6 max-w-xs text-xs text-cf-muted">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
