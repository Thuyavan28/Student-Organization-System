import { LuTriangleAlert, LuCalendar, LuUser } from 'react-icons/lu';
import { TASK_STATUSES, humanize } from '../../utils/constants';
import { formatDate } from '../../utils/formatDate';
import Badge from '../ui/Badge';

export function isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export default function TaskCard({ task, onStatusChange, onEdit, canChangeStatus = true }) {
  const overdue = isOverdue(task);

  return (
    <article
      className={`rounded-lg border bg-white p-3 shadow-sm ${overdue ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900">{task.title}</h4>
        {overdue && (
          <Badge tone="red">
            <LuTriangleAlert className="mr-1 h-3 w-3" aria-hidden="true" /> Overdue
          </Badge>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <LuUser aria-hidden="true" /> {task.assignee?.name ?? 'Unassigned'}
        </li>
        <li className="flex items-center gap-1.5">
          <LuCalendar aria-hidden="true" /> {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
        </li>
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <select
          aria-label={`Status of ${task.title}`}
          className="input-base !py-1 !text-xs"
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
          <button type="button" className="text-xs font-medium text-primary-700 hover:underline" onClick={() => onEdit(task)}>
            Edit
          </button>
        )}
      </div>
    </article>
  );
}
