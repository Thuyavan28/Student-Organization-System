import { LuInbox, LuSearch, LuCircleCheck, LuPlus, LuFilterX, LuUndo2 } from 'react-icons/lu';
import Button from './Button';

export { default as ErrorState } from './ErrorState';

const PRESET_ICONS = {
  'first-use': LuInbox,
  'no-results': LuSearch,
  'cleared': LuCircleCheck,
};

export default function EmptyState({
  preset, // 'first-use' | 'no-results' | 'cleared'
  icon: CustomIcon,
  title,
  message,
  action,
  secondaryAction,
  onResetFilters,
  onUndo,
  className = '',
}) {
  // Derive icon
  const Icon = CustomIcon || (preset && PRESET_ICONS[preset]) || LuInbox;

  // Derive preset defaults if not provided
  let defaultTitle = title;
  let defaultMessage = message;

  if (preset === 'no-results' && !title) {
    defaultTitle = 'No matching results found';
    defaultMessage = message || 'Try adjusting your search terms or clearing active filters.';
  } else if (preset === 'cleared' && !title) {
    defaultTitle = 'All caught up';
    defaultMessage = message || 'There are no pending items left in this queue.';
  } else if (preset === 'first-use' && !title) {
    defaultTitle = 'Nothing here yet';
    defaultMessage = message || 'Get started by creating your first entry.';
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm ${className}`}
      role="region"
      aria-label={defaultTitle || 'Empty state'}
    >
      {/* Icon Capsule */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 shadow-inner">
        <Icon className="h-7 w-7 text-slate-500" aria-hidden="true" />
      </div>

      {/* Heading & Value Line */}
      {defaultTitle && <h3 className="mb-1.5 text-base font-bold text-slate-900">{defaultTitle}</h3>}
      {defaultMessage && (
        <p className="mb-6 max-w-sm text-xs text-slate-500 leading-relaxed">{defaultMessage}</p>
      )}

      {/* Primary & Secondary CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {action}

        {onResetFilters && (
          <Button size="sm" variant="secondary" icon={LuFilterX} onClick={onResetFilters}>
            Clear all filters
          </Button>
        )}

        {onUndo && (
          <Button size="sm" variant="secondary" icon={LuUndo2} onClick={onUndo}>
            Undo last action
          </Button>
        )}

        {secondaryAction}
      </div>
    </div>
  );
}

