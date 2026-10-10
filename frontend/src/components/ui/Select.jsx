import { forwardRef } from 'react';
import { LuChevronDown } from 'react-icons/lu';

const Select = forwardRef(function Select({ label, id, error, children, className = '', ...rest }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-cf-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          ref={ref}
          className={`select-base pr-9 ${error ? 'border-cf-accent ring-2 ring-cf-accent/20' : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <LuChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-muted"
          aria-hidden="true"
        />
      </div>
      {error && <p className="text-xs text-cf-accent">{error}</p>}
    </div>
  );
});

export default Select;
