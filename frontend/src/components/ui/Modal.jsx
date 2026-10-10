import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ open, title, onClose, size = 'md', children }) {
  // Prevent body scroll when modal is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className={`relative z-10 w-full ${SIZES[size]} rounded-2xl border border-cf-divider bg-white shadow-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cf-divider px-6 py-4">
          <h2 className="text-sm font-semibold text-cf-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-cf-muted hover:bg-cf-hover hover:text-cf-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
