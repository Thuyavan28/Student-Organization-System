import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, as: Component = 'input', className = '', ...rest },
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
      <Component
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`input-base ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
});

export default Input;
