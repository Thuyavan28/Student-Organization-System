import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, id, error, helpText, className = '', ...rest }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-cf-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`input-base ${error ? 'border-cf-accent ring-2 ring-cf-accent/20' : ''} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-cf-accent">{error}</p>}
      {!error && helpText && <p className="text-xs text-cf-muted">{helpText}</p>}
    </div>
  );
});

export default Input;
