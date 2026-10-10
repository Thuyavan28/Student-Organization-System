export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const dimension = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-4' }[size];
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <span
        className={`${dimension} animate-spin rounded-full border-slate-300 border-t-primary-600`}
      />
    </span>
  );
}

export function PageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
