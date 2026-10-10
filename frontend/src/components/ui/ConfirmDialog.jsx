import { LuTriangleAlert } from 'react-icons/lu';
import Button from './Button';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, variant = 'danger', confirmLabel = 'Confirm', loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-cf-divider bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <LuTriangleAlert className="h-5 w-5 text-cf-accent" />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-cf-fg">{title}</h3>
            {message && <p className="text-xs text-cf-muted">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
