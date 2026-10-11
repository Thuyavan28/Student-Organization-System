import { useMemo, useState } from 'react';
import { LuCircleCheck, LuClipboardList, LuClock, LuListTodo, LuPlus, LuTriangleAlert, LuUserX } from 'react-icons/lu';
import { apiErrorMessage } from '../../api/axiosInstance';
import { eventsApi } from '../../api/events.api';
import { usersApi } from '../../api/users.api';
import TaskBoard from '../../components/feature/TaskBoard';
import TaskForm from '../../components/feature/TaskForm';
import Button from '../../components/ui/Button';
import DataCard, { DataCardBody } from '../../components/ui/DataCard';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useTasksList, useTasksOverview, useUpdateTask } from '../../hooks/queries/tasks.queries';

function ProgressBar({ done, inProgress, total }) {
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-cf-subtle" role="progressbar" aria-valuenow={Math.round(pct(done))} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex h-full">
        <div className="h-full bg-cf-fg" style={{ width: `${pct(done)}%` }} />
        <div className="h-full bg-cf-fg/35" style={{ width: `${pct(inProgress)}%` }} />
      </div>
    </div>
  );
}

// The team's task dashboard: how many tasks are open, how each event is progressing, who is carrying what.
export default function Tasks() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole('ADMIN');
  const isVolunteer = hasRole('VOLUNTEER');
  const [eventId, setEventId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [form, setForm] = useState(null); // null | { task } | { task: null }

  const overview = useTasksOverview();
  const tasks = useTasksList({ eventId: eventId || undefined, assigneeId: assigneeId || undefined, pageSize: 100 });
  const update = useUpdateTask();
  const events = useFetch(() => eventsApi.list({ pageSize: 100 }), [], { key: 'tasks-events' });
  const people = useFetch(() => usersApi.search({ fields: 'id,name,role' }), [], { key: 'tasks-people', enabled: isAdmin });

  const o = overview.data?.data;
  const rows = tasks.data?.data ?? [];
  const loadingOverview = overview.isLoading;
  const assignable = useMemo(() => (people.data ?? []).filter((p) => ['VOLUNTEER', 'TREASURER', 'ADMIN'].includes(p.role)), [people.data]);

  const changeStatus = async (task, status) => {
    try {
      await update.mutateAsync({ id: task.id, status });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };
  const canChangeStatus = (task) => isAdmin || task.assigneeId === user?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={isVolunteer ? 'Your assigned tasks, and how the whole team is doing.' : 'Split event duties between volunteers and see what is on track.'}
        actions={isAdmin && <Button icon={LuPlus} onClick={() => setForm({ task: null })}>New task</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending" value={o?.pending ?? 0} sub="Not started yet" icon={LuListTodo} loading={loadingOverview} />
        <StatCard label="In progress" value={o?.inProgress ?? 0} sub="Being worked on" icon={LuClock} loading={loadingOverview} />
        <StatCard label="Completed" value={o?.completed ?? 0} sub="Done" icon={LuCircleCheck} loading={loadingOverview} />
        <StatCard label="Overdue" value={o?.overdue ?? 0} sub={o?.unassigned ? `${o.unassigned} open task${o.unassigned === 1 ? '' : 's'} unassigned` : 'Past the due date'} icon={LuTriangleAlert} tone={o?.overdue ? 'danger' : undefined} loading={loadingOverview} />
      </div>

      {overview.error ? (
        <ErrorState message={apiErrorMessage(overview.error)} onRetry={overview.refetch} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DataCard title="Progress by event" subtitle="Dark = completed, light = in progress">
            <DataCardBody className="space-y-5">
              {!o?.byEvent?.length && !loadingOverview && <p className="text-sm text-cf-muted">No tasks yet.</p>}
              {(o?.byEvent ?? []).map((group) => (
                <button
                  key={group.eventId ?? 'general'}
                  type="button"
                  onClick={() => setEventId(group.eventId ? String(group.eventId) : '')}
                  className="block w-full rounded-xl text-left transition-colors hover:bg-cf-hover"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-cf-fg">{group.title}</span>
                    <span className="shrink-0 tabular-nums text-cf-muted">
                      {group.completed}/{group.total} done{group.overdue ? ` · ${group.overdue} overdue` : ''}
                    </span>
                  </div>
                  <ProgressBar done={group.completed} inProgress={group.inProgress} total={group.total} />
                </button>
              ))}
            </DataCardBody>
          </DataCard>

          <DataCard title="Who is doing what" subtitle="Workload per person">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-cf-fg/80 text-xs font-semibold text-cf-fg">
                  <tr>
                    <th scope="col" className="px-6 py-3">Person</th>
                    <th scope="col" className="px-3 py-3 text-right">Open</th>
                    <th scope="col" className="px-3 py-3 text-right">Done</th>
                    <th scope="col" className="px-6 py-3 text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cf-divider">
                  {(o?.byAssignee ?? []).map((person) => (
                    <tr key={person.userId} className="cursor-pointer transition-colors hover:bg-cf-hover" onClick={() => !isVolunteer && setAssigneeId(String(person.userId))}>
                      <td className="px-6 py-3 font-medium text-cf-fg">{person.name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{person.open}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{person.completed}</td>
                      <td className={`px-6 py-3 text-right tabular-nums ${person.overdue ? 'font-semibold text-cf-accent' : 'text-cf-muted'}`}>{person.overdue}</td>
                    </tr>
                  ))}
                  {!o?.byAssignee?.length && !loadingOverview && (
                    <tr><td colSpan={4} className="px-6 py-6 text-sm text-cf-muted">Nobody has been assigned a task yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {o?.unassigned > 0 && (
              <p className="flex items-center gap-2 border-t border-cf-divider px-6 py-3 text-xs text-cf-muted">
                <LuUserX className="h-4 w-4" aria-hidden="true" /> {o.unassigned} open task{o.unassigned === 1 ? ' has' : 's have'} nobody assigned.
              </p>
            )}
          </DataCard>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <Select label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="All events" options={(events.data ?? []).map((e) => ({ value: e.id, label: e.title }))} />
        </div>
        {isAdmin && (
          <div className="w-52">
            <Select label="Assigned to" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="Everyone" options={assignable.map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        )}
        {(eventId || assigneeId) && <Button variant="secondary" size="sm" onClick={() => { setEventId(''); setAssigneeId(''); }}>Clear filters</Button>}
      </div>

      {tasks.error ? (
        <ErrorState message={apiErrorMessage(tasks.error)} onRetry={tasks.refetch} />
      ) : !tasks.isLoading && rows.length === 0 ? (
        <EmptyState icon={LuClipboardList} title="No tasks found" message={isVolunteer ? 'Nothing has been assigned to you yet.' : 'Create a task, or clear the filters.'} />
      ) : (
        <TaskBoard tasks={rows} onStatusChange={changeStatus} onEdit={isAdmin ? (task) => setForm({ task }) : undefined} canChangeStatus={canChangeStatus} />
      )}

      {form && <TaskForm task={form.task} events={events.data ?? []} people={assignable} defaultEventId={eventId} onClose={() => setForm(null)} />}
    </div>
  );
}
