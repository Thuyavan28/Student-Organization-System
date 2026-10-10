import { TASK_STATUSES, humanize } from '../../utils/constants';
import Badge from '../ui/Badge';
import TaskCard from './TaskCard';

export default function TaskBoard({ tasks, onStatusChange, onEdit, canChangeStatus = () => true }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section key={status} className="rounded-xl bg-slate-100/70 p-3" aria-label={`${humanize(status)} tasks`}>
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{humanize(status)}</h3>
              <Badge status={status}>{column.length}</Badge>
            </header>
            <div className="space-y-2">
              {column.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No tasks here</p>}
              {column.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  canChangeStatus={canChangeStatus(task)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
