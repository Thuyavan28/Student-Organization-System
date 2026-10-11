import { useState } from 'react';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { useCreateTask, useDeleteTask, useUpdateTask } from '../../hooks/queries/tasks.queries';
import { useToast } from '../../context/ToastContext';
import { toDateInput } from '../../utils/formatDate';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

// Create or edit a task (admin only). Editing also offers Delete.
export default function TaskForm({ task, events, people, defaultEventId, onClose }) {
  const toast = useToast();
  const editing = Boolean(task);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    eventId: String(task?.eventId ?? defaultEventId ?? ''),
    assigneeId: String(task?.assigneeId ?? ''),
    dueDate: task?.dueDate ? toDateInput(task.dueDate) : '',
  });
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const saving = create.isPending || update.isPending || remove.isPending;

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.title.trim().length < 3) found.title = 'Give the task a short title (3+ characters)';
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      eventId: form.eventId ? Number(form.eventId) : null,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      dueDate: form.dueDate ? new Date(`${form.dueDate}T23:59:00`).toISOString() : null,
    };
    try {
      if (editing) await update.mutateAsync({ id: task.id, ...body });
      else await create.mutateAsync(body);
      toast.success(editing ? 'Task updated' : 'Task created');
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    }
  };

  const del = async () => {
    try {
      await remove.mutateAsync(task.id);
      toast.success('Task deleted');
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <Modal
      open
      title={editing ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <Button variant="secondary" className="mr-auto" onClick={confirmDelete ? del : () => setConfirmDelete(true)} disabled={saving}>
              {confirmDelete ? 'Click again to delete' : 'Delete'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="task-form" loading={saving}>{editing ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" id="task-title" label="Task" required placeholder="Set up the registration desk" value={form.title} onChange={set('title')} error={errors.title} />
        <Input className="sm:col-span-2" id="task-desc" label="Details" as="textarea" rows={3} value={form.description} onChange={set('description')} error={errors.description} />
        <Select id="task-event" label="Event" value={form.eventId} onChange={set('eventId')} placeholder="General club task (no event)" options={events.map((e) => ({ value: e.id, label: e.title }))} />
        <Select id="task-assignee" label="Assigned to" value={form.assigneeId} onChange={set('assigneeId')} placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} />
        <Input id="task-due" label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
      </form>
    </Modal>
  );
}
