import Spinner from './Spinner';

const VARIANTS = {
  primary:   'bg-cf-fg text-white hover:bg-cf-fg/90 focus-visible:ring-cf-fg',
  secondary: 'bg-white text-cf-fg border border-cf-border hover:bg-cf-hover focus-visible:ring-cf-fg',
  danger:    'bg-cf-accent text-white hover:bg-red-700 focus-visible:ring-cf-accent',
  success:   'bg-cf-success text-white hover:bg-green-700 focus-visible:ring-cf-success',
  ghost:     'text-cf-muted hover:bg-cf-hover hover:text-cf-fg focus-visible:ring-cf-fg',
  link:      'text-cf-fg underline-offset-4 hover:underline p-0 focus-visible:ring-cf-fg',
};

const SIZES = {
  sm: 'px-3 py-2 text-xs gap-1.5 min-h-[36px]',
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
  lg: 'px-5 py-3 text-base gap-2 min-h-[52px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const isLink = variant === 'link';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${isLink ? '' : SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size="sm" label="Working" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
