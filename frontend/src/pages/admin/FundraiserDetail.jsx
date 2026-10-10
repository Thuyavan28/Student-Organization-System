import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuArrowLeft, LuDollarSign, LuPencil, LuPlus } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { fundraisersApi } from '../../api/fundraisers.api';
import { tasksApi } from '../../api/tasks.api';
import FundraiserProgress from '../../components/feature/FundraiserProgress';
import TaskBoard from '../../components/feature/TaskBoard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { toPaise } from '../../utils/formatCurrency';
import { formatDate, toDateInput } from '../../utils/formatDate';
import { FundraiserForm } from './Fundraisers';

function TaskForm({ fundraiserId, task, assignees, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
    dueDate: task?.dueDate ? toDateInput(task.dueDate) : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setErrors({ title: 'Enter a task title' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      };
      if (editing) await tasksApi.update(task.id, payload);
      else await tasksApi.create({ ...payload, fundraiserId });
      toast.success(editing ? 'Task updated' : 'Task added');
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={editing ? 'Edit task' : 'Add task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="task-form" loading={saving}>{editing ? 'Save task' : 'Add task'}</Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Title" value={form.title} onChange={set('title')} error={errors.title} />
        <Input label="Details" as="textarea" rows={3} value={form.description} onChange={set('description')} />
        <Select
          label="Assign to"
          value={form.assigneeId}
          onChange={set('assigneeId')}
          placeholder="Unassigned"
          options={(assignees ?? []).map((user) => ({ value: user.id, label: `${user.name} (${user.role.toLowerCase()})` }))}
        />
        <Input label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
      </form>
    </Modal>
  );
}

function IncomeForm({ fundraiserId, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', description: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (toPaise(form.amount) <= 0) found.amount = 'Enter an amount greater than zero';
    if (form.description.trim().length < 3) found.description = 'Describe the income, for example bake sale cash';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await fundraisersApi.addIncome(fundraiserId, { amount: toPaise(form.amount), description: form.description.trim() });
      toast.success('Income recorded in the ledger');
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Record fundraiser income"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="income-form" loading={saving}>Record income</Button>
        </>
      }
    >
      <form id="income-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Amount (Rs)" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} placeholder="Bake sale cash, day 2" />
        <p className="text-xs text-cf-muted">This adds a row to the Finance ledger, so the raised total and the Finance page always agree.</p>
      </form>
    </Modal>
  );
}

export default function FundraiserDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const canRecordIncome = hasRole('ADMIN', 'TREASURER');
  const [modal, setModal] = useState(null);

  const fundraiser = useFetch(() => fundraisersApi.get(id), [id]);
  const summary = useFetch(() => fundraisersApi.summary(id), [id]);
  const tasks = useFetch(() => tasksApi.list({ fundraiserId: id, pageSize: 100 }), [id]);
  const assignees = useFetch(() => tasksApi.assignees({}), [], { enabled: isAdmin });

  const refreshAll = () => {
    summary.reload();
    tasks.reload();
  };

  const changeStatus = async (task, status) => {
    try {
      await tasksApi.update(task.id, { status });
      refreshAll();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (fundraiser.error) return <ErrorState message={fundraiser.error} onRetry={fundraiser.reload} />;
  const f = fundraiser.data;

  return (
    <>
      <Link to="/admin/fundraisers" className="mb-3 inline-flex items-center gap-1 text-sm text-cf-muted hover:text-cf-fg">
        <LuArrowLeft aria-hidden="true" /> All fundraisers
      </Link>
      <PageHeader
        title={f?.title ?? 'Fundraiser'}
        subtitle={f ? `${formatDate(f.startDate)} to ${formatDate(f.endDate)}` : undefined}
        actions={
          <>
            {f && <Badge status={f.status} />}
            {canRecordIncome && <Button variant="secondary" icon={LuDollarSign} onClick={() => setModal({ type: 'income' })}>Record income</Button>}
            {isAdmin && <Button variant="secondary" icon={LuPencil} onClick={() => setModal({ type: 'edit' })}>Edit</Button>}
            {isAdmin && <Button icon={LuPlus} onClick={() => setModal({ type: 'task', task: null })}>Add task</Button>}
          </>
        }
      />
      {f?.description && <p className="mb-5 max-w-3xl text-sm text-cf-muted">{f.description}</p>}

      <Card title="Progress">
        {summary.loading && !summary.data ? <Skeleton className="h-28 w-full" /> : summary.error ? <ErrorState message={summary.error} onRetry={summary.reload} /> : <FundraiserProgress summary={summary.data} />}
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-cf-fg">Task board</h2>
        {tasks.error ? (
          <ErrorState message={tasks.error} onRetry={tasks.reload} />
        ) : tasks.loading && !tasks.data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <TaskBoard
            tasks={tasks.data ?? []}
            onStatusChange={changeStatus}
            onEdit={isAdmin ? (task) => setModal({ type: 'task', task }) : undefined}
            canChangeStatus={(task) => isAdmin || task.assigneeId === user.id}
          />
        )}
      </div>

      {modal?.type === 'task' && (
        <TaskForm fundraiserId={Number(id)} task={modal.task} assignees={assignees.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); refreshAll(); }} />
      )}
      {modal?.type === 'income' && (
        <IncomeForm fundraiserId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); summary.reload(); }} />
      )}
      {modal?.type === 'edit' && f && (
        <FundraiserForm fundraiser={f} onClose={() => setModal(null)} onSaved={() => { setModal(null); fundraiser.reload(); summary.reload(); }} />
      )}
    </>
  );
}
