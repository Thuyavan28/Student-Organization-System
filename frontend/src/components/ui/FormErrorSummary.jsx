import { useEffect, useRef } from 'react';
import { LuCircleAlert, LuArrowDown } from 'react-icons/lu';

export default function FormErrorSummary({
  errors = {}, // Object of { fieldName: errorMessage } or array
  title = 'There was a problem with your submission',
  subtitle = 'Please review the highlighted fields below to continue:',
  className = '',
}) {
  const summaryRef = useRef(null);

  const errorEntries = Array.isArray(errors)
    ? errors.map((err, i) => [String(i), err])
    : Object.entries(errors).filter(([, msg]) => Boolean(msg));

  useEffect(() => {
    if (errorEntries.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [errorEntries.length]);

  if (errorEntries.length === 0) return null;

  const scrollToField = (fieldName) => {
    const el = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-summary-heading"
      className={`rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs text-rose-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${className}`}
    >
      <div className="flex items-center gap-2 font-bold text-rose-900">
        <LuCircleAlert className="h-4 w-4 shrink-0 text-rose-600" />
        <h3 id="form-error-summary-heading" className="text-sm font-extrabold text-rose-950">
          {title}
        </h3>
      </div>

      {subtitle && <p className="mt-1 text-xs text-rose-800 font-medium">{subtitle}</p>}

      <ul className="mt-3 space-y-1.5 list-disc list-inside">
        {errorEntries.map(([field, msg]) => (
          <li key={field} className="text-rose-900">
            <button
              type="button"
              onClick={() => scrollToField(field)}
              className="inline-flex items-center gap-1 font-semibold text-rose-800 underline hover:text-rose-950 transition-colors"
            >
              <span>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</span>
              <LuArrowDown className="h-3 w-3 inline text-rose-500" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
