import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCircleCheck, LuCopy, LuCheck, LuArrowRight, LuHouse } from 'react-icons/lu';
import Button from './Button';
import Modal from './Modal';

export default function SuccessScreen({
  title = 'Operation Successful!',
  subtitle = 'Your request has been processed and saved.',
  referenceId,
  referenceLabel = 'Reference Number',
  details = [], // Array of { label, value }
  primaryAction, // { label, onClick, to, icon }
  secondaryAction, // { label, onClick, to }
  celebratoryBadge = 'Confirmed & Saved',
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    if (!referenceId) return;
    navigator.clipboard?.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`mx-auto max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 text-center shadow-xl ${className}`}
      role="region"
      aria-label="Success confirmation"
    >
      {/* Animated Green Halo Badge */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-60" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25">
          <LuCircleCheck className="h-9 w-9 stroke-[2.2]" />
        </div>
      </div>

      {celebratoryBadge && (
        <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
          {celebratoryBadge}
        </span>
      )}

      {/* Main Confirmation Title & Message */}
      <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{subtitle}</p>

      {/* Reference Box with Copy */}
      {referenceId && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {referenceLabel}
            </p>
            <p className="font-mono text-sm font-extrabold text-slate-900">{referenceId}</p>
          </div>
          <button
            type="button"
            onClick={copyRef}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {copied ? (
              <>
                <LuCheck className="h-3.5 w-3.5 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <LuCopy className="h-3.5 w-3.5 text-slate-400" /> Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Key Details List */}
      {details.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-left">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-2 first:pt-1 last:pb-1">
              <span className="text-slate-500">{d.label}</span>
              <span className="font-bold text-slate-900">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary & Secondary Next Steps */}
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        {primaryAction?.to ? (
          <Link to={primaryAction.to} className="w-full sm:w-auto">
            <Button className="w-full font-bold shadow-md" icon={primaryAction.icon || LuArrowRight}>
              {primaryAction.label}
            </Button>
          </Link>
        ) : primaryAction?.onClick ? (
          <Button
            className="w-full sm:w-auto font-bold shadow-md"
            icon={primaryAction.icon || LuArrowRight}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        ) : null}

        {secondaryAction?.to ? (
          <Link to={secondaryAction.to} className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full font-medium" icon={LuHouse}>
              {secondaryAction.label}
            </Button>
          </Link>
        ) : secondaryAction?.onClick ? (
          <Button variant="secondary" className="w-full sm:w-auto font-medium" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : (
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full font-medium" icon={LuHouse}>
              Back to Home
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export function SuccessModal({ open, onClose, ...screenProps }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} size="md">
      <SuccessScreen {...screenProps} />
    </Modal>
  );
}
