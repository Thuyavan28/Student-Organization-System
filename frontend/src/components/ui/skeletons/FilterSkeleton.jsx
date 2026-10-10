// filter bar skeleton matching FilterCard dimensions.
export default function FilterSkeleton({ fields = 3 }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-white p-4 flex flex-wrap gap-3" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="skeleton h-12 rounded-xl" style={{ width: i === 0 ? 200 : 140 }} />
      ))}
      <div className="skeleton h-12 w-24 rounded-xl" />
    </div>
  );
}
