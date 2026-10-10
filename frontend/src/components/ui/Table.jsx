import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

export default function Table({
  columns,
  rows,
  loading = false,
  rowKey = 'id',
  sort,
  onSort,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  onRowClick,
}) {
  const showEmpty = !loading && (!rows || rows.length === 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => {
              const sortable = column.sortable && onSort;
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${column.headerClassName || ''}`}
                  aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 uppercase hover:text-slate-800"
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                      {active && (sort.order === 'asc' ? <FiArrowUp aria-hidden="true" /> : <FiArrowDown aria-hidden="true" />)}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {loading &&
            Array.from({ length: 6 }, (_, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[10rem]" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            rows?.map((row) => (
              <tr
                key={row[rowKey]}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle text-slate-700 ${column.className || ''}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
      {showEmpty && <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />}
    </div>
  );
}
