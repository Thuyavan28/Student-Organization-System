// Table with configurable rows and columns inside a DataCard shell.
export default function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="rounded-2xl border border-cf-border bg-white overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="border-b border-cf-divider px-6 py-4 flex items-center justify-between">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton h-4 w-20" />
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cf-divider">
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="skeleton h-4 w-full" style={{ maxWidth: i === 0 ? 120 : 80 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className="border-b border-cf-divider last:border-0">
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="skeleton h-4" style={{ width: c === 0 ? '70%' : c === cols - 1 ? '40%' : '60%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
