export default function Spinner({ size = 'md', label = 'Loading' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5 border-[1.5px]' : size === 'lg' ? 'h-7 w-7 border-2' : 'h-5 w-5 border-2';
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <span className={`${s} animate-spin rounded-full border-current border-t-transparent`} aria-hidden="true" />
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white" role="status" aria-label="Loading page">
      <Spinner size="lg" />
    </div>
  );
}
