// Four stat cards in a row matching the real StatCard layout.
export default function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-cf-border bg-white p-6" aria-hidden="true">
          <div className="flex items-start justify-between">
            <div className="skeleton h-4 w-28 mb-3" />
            <div className="skeleton h-5 w-5 rounded" />
          </div>
          <div className="skeleton h-8 w-20 mb-2" />
          <div className="skeleton h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
