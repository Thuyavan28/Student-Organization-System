// Matches the PageHeader component's dimensions exactly.
export default function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between mb-8 gap-4" aria-hidden="true">
      <div>
        <div className="skeleton h-9 w-48 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="skeleton h-11 w-32 rounded-xl" />
    </div>
  );
}
