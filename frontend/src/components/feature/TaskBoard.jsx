import { TASK_STATUSES, humanize } from '../../utils/constants';
import Badge from '../ui/Badge';
import TaskCard from './TaskCard';

// Three columns: Pending, In progress, Completed.
export default function TaskBoard({ tasks, onStatusChange, onEdit, canChangeStatus = () => true, showEvent = true }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section key={status} className="rounded-2xl border border-cf-divider bg-cf-subtle p-3" aria-label={`${humanize(status)} tasks`}>
            <header className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-cf-fg">{humanize(status)}</h3>
              <Badge status={status}>{column.length}</Badge>
            </header>
            <div className="space-y-3">
              {column.length === 0 && <p className="py-6 text-center text-xs text-cf-muted">No tasks here</p>}
              {column.map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} canChangeStatus={canChangeStatus(task)} showEvent={showEvent} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
