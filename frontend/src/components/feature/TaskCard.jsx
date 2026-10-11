import { LuCalendar, LuPencil, LuTriangleAlert, LuUser } from 'react-icons/lu';
import { TASK_STATUSES, humanize } from '../../utils/constants';
import { formatDate } from '../../utils/formatDate';
import Badge from '../ui/Badge';

export function isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

// One task. The assignee (or an admin) can move it between columns with the status picker; only an admin can edit it.
export default function TaskCard({ task, onStatusChange, onEdit, canChangeStatus = true, showEvent = true }) {
  const overdue = isOverdue(task);
  return (
    <article className={`rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md ${overdue ? 'border-cf-accent' : 'border-cf-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-cf-fg">{task.title}</h4>
        {overdue && (
          <Badge tone="red">
            <LuTriangleAlert className="mr-1 h-3 w-3" aria-hidden="true" /> Overdue
          </Badge>
        )}
      </div>
      {showEvent && <p className="mt-1 text-xs text-cf-muted">{task.event?.title ?? 'General club task'}</p>}
      {task.description && <p className="mt-2 line-clamp-2 text-xs text-cf-muted">{task.description}</p>}
      <ul className="mt-3 space-y-1 text-xs text-cf-fg">
        <li className="flex items-center gap-1.5">
          <LuUser className="h-3.5 w-3.5 text-cf-muted" aria-hidden="true" /> {task.assignee?.name ?? 'Unassigned'}
        </li>
        <li className="flex items-center gap-1.5">
          <LuCalendar className="h-3.5 w-3.5 text-cf-muted" aria-hidden="true" /> {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
        </li>
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <select
          aria-label={`Status of ${task.title}`}
          className="select-base !py-1.5 !text-xs"
          value={task.status}
          disabled={!canChangeStatus}
          onChange={(event) => onStatusChange(task, event.target.value)}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </select>
        {onEdit && (
          <button type="button" aria-label={`Edit ${task.title}`} className="rounded-xl border border-cf-border p-2 text-cf-fg transition-colors hover:bg-cf-hover" onClick={() => onEdit(task)}>
            <LuPencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
