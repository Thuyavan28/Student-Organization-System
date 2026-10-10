import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from 'react-icons/lu';
import { useToast } from '../../context/ToastContext';

const ICONS = {
  success: LuCircleCheck,
  error: LuCircleAlert,
  info: LuInfo,
};

const THEMES = {
  success: {
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    badge: 'Success',
    barColor: 'bg-emerald-400',
  },
  error: {
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15 border-rose-500/30',
    badge: 'Attention',
    barColor: 'bg-rose-400',
  },
  info: {
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15 border-sky-500/30',
    badge: 'Update',
    barColor: 'bg-sky-400',
  },
};

export default function Toast({ toasts: propToasts, onDismiss }) {
  const context = useToast();
  const toasts = propToasts ?? context.toasts ?? [];
  const dismiss = onDismiss ?? context.dismiss ?? (() => {});

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || LuInfo;
        const theme = THEMES[t.type] || THEMES.info;

        return (
          <div
            key={t.id}
            className="pointer-events-auto group relative flex items-start gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md animate-toast-enter overflow-hidden transition-all duration-300 hover:border-slate-600 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            {/* Status Icon Badge */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${theme.iconBg} ${theme.iconColor}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t.title || theme.badge}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-200 leading-relaxed break-words">
                {t.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LuX className="h-4 w-4" />
            </button>

            {/* Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/80">
              <div
                className={`h-full ${theme.barColor} animate-toast-progress`}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
