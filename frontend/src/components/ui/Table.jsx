import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="border-b border-cf-fg/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className = '', right = false }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold text-cf-fg ${right ? 'text-right' : 'text-left'} ${className}`}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-cf-divider">{children}</tbody>;
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      className={`transition-colors ${onClick ? 'cursor-pointer hover:bg-cf-hover' : 'hover:bg-cf-hover'} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '', right = false, muted = false }) {
  return (
    <td
      className={`px-4 py-3 ${right ? 'text-right' : ''} ${muted ? 'text-cf-muted' : 'text-cf-fg'} ${className}`}
    >
      {children}
    </td>
  );
}

// Backward-compat default export: accepts the old { columns, rows, loading, emptyIcon, emptyTitle, emptyMessage } API.
export default function TableCompat({ columns = [], rows = [], loading = false, emptyIcon, emptyTitle = 'No data', emptyMessage }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-cf-fg/80">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key ?? col.header}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold text-cf-fg ${col.right ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cf-divider">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="transition-colors hover:bg-cf-hover">
              {columns.map((col) => (
                <td
                  key={col.key ?? col.header}
                  className={`px-4 py-3 text-cf-fg ${col.right ? 'text-right' : ''} ${col.muted ? 'text-cf-muted' : ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
