import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from 'react-icons/lu';
import { useToast } from '../../context/ToastContext';

const ICONS = {
  success: LuCircleCheck,
  error: LuCircleAlert,
  info: LuInfo,
};

const STYLES = {
  success: 'border-cf-success/30 bg-white text-cf-success',
  error: 'border-cf-accent/30 bg-white text-cf-accent',
  info: 'border-cf-divider bg-white text-cf-muted',
};

export default function Toast() {
  const { toasts, dismiss } = useToast();
  if (!toasts?.length) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 sm:bottom-4" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] ?? LuInfo;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-lg min-w-[280px] max-w-sm ${STYLES[t.type] ?? STYLES.info}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium text-cf-fg">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-0.5 hover:bg-cf-hover transition-colors"
            >
              <LuX className="h-3.5 w-3.5 text-cf-muted" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
