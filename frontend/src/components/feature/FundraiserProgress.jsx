import { LuTriangleAlert, LuCircleCheck } from 'react-icons/lu';
import { formatCurrency } from '../../utils/formatCurrency';
import Badge from '../ui/Badge';

function Bar({ label, value, caption }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums">{caption}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function FundraiserProgress({ summary, compact = false }) {
  if (!summary) return null;
  const { raised, goal, goalPct, timePct, taskPct, tasks, overdue, onTrack } = summary;
  const totalTasks = (tasks?.PENDING ?? 0) + (tasks?.IN_PROGRESS ?? 0) + (tasks?.COMPLETED ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(raised)}</p>
          <p className="text-sm text-slate-500">raised of {formatCurrency(goal)} goal</p>
        </div>
        {onTrack ? (
          <Badge tone="green">
            <LuCircleCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> On track
          </Badge>
        ) : (
          <Badge tone="amber">
            <LuTriangleAlert className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Behind schedule
          </Badge>
        )}
      </div>
      <Bar label="Goal reached" value={goalPct} caption={`${Math.round(goalPct)}%`} />
      {!compact && (
        <>
          <Bar label="Tasks completed" value={taskPct} caption={`${tasks?.COMPLETED ?? 0} of ${totalTasks}`} />
          <Bar label="Time elapsed" value={timePct} caption={`${Math.round(timePct)}%`} />
          <p className="text-xs text-slate-500">
            {overdue > 0 ? `${overdue} overdue task${overdue === 1 ? '' : 's'}. ` : 'No overdue tasks. '}
            On track means goal and task progress are within 10 points of the time elapsed.
          </p>
        </>
      )}
    </div>
  );
}
