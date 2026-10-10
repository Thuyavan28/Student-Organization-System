import { forwardRef, useId } from 'react';

const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className = '', ...rest },
  ref,
) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`input-base ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Select;
