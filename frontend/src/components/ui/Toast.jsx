import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const STYLES = {
  success: { icon: FiCheckCircle, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: FiAlertCircle, classes: 'border-red-200 bg-red-50 text-red-800' },
  info: { icon: FiInfo, classes: 'border-primary-200 bg-primary-50 text-primary-800' },
};

export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-6"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { icon: Icon, classes } = STYLES[toast.type] || STYLES.info;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${classes}`}
            role="status"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              <FiX className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
