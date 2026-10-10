import { forwardRef } from 'react';
import { LuCircleAlert } from 'react-icons/lu';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    error,
    helpText,
    required = false,
    as = 'input',
    rows = 3,
    className = '',
    icon: Icon,
    trailing,
    ...rest
  },
  ref,
) {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helpId = helpText && inputId ? `${inputId}-help` : undefined;
  const Component = as === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </span>
          {!required && <span className="text-[10px] text-slate-400 font-normal">(optional)</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}

        <Component
          id={inputId}
          name={name || id}
          ref={ref}
          rows={as === 'textarea' ? rows : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          className={`input-base ${Icon ? 'pl-10' : ''} ${trailing ? 'pr-11' : ''} ${
            error
              ? 'border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-600 focus:ring-rose-500/30'
              : ''
          } ${className}`}
          {...rest}
        />

        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>

      {/* Accessible Inline Error */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 mt-0.5 text-xs font-medium text-rose-600 animate-slide-in"
        >
          <LuCircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {!error && helpText && (
        <p id={helpId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}
    </div>
  );
});

export default Input;
