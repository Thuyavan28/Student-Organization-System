// Chart placeholder with correct aspect ratio so layout does not shift when the chart loads.
export default function ChartSkeleton({ height = 280 }) {
  return (
    <div
      className="rounded-2xl border border-cf-border bg-white p-6 flex flex-col gap-3"
      style={{ minHeight: height }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-4 w-24" />
      </div>
      <div className="skeleton flex-1 rounded-xl" style={{ minHeight: height - 80 }} />
    </div>
  );
}
