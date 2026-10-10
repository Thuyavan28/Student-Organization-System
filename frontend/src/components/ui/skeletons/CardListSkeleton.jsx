// Stacked card list for mobile views.
export default function CardListSkeleton({ count = 5 }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-cf-border bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
