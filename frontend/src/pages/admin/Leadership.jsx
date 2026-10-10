import { useState } from 'react';
import { FiAward, FiPlus } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { leadershipApi } from '../../api/leadership.api';
import { tasksApi } from '../../api/tasks.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { LEADERSHIP_POSITIONS, humanize } from '../../utils/constants';
import { formatDate, toDateInput } from '../../utils/formatDate';

function LeadershipForm({ users, onClose, onSaved }) {
  const toast = useToast();
  const start = new Date();
  const [form, setForm] = useState({
    userId: '',
    position: 'EVENT_LEAD',
    termStart: toDateInput(start),
    termEnd: toDateInput(new Date(start.getTime() + 365 * 86400000)),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!form.userId) found.userId = 'Choose a person';
    if (form.termEnd <= form.termStart) found.termEnd = 'The term must end after it starts';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await leadershipApi.create({ ...form, userId: Number(form.userId) });
      toast.success('Officer added');
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
      title="Add officer"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="leadership-form" loading={saving}>Add officer</Button>
        </>
      }
    >
      <form id="leadership-form" onSubmit={submit} noValidate className="space-y-4">
        <Select
          label="Person"
          value={form.userId}
          onChange={set('userId')}
          placeholder="Select a person"
          options={(users ?? []).map((user) => ({ value: user.id, label: `${user.name} (${user.email})` }))}
          error={errors.userId}
        />
        <Select label="Position" value={form.position} onChange={set('position')} options={LEADERSHIP_POSITIONS.map((value) => ({ value, label: humanize(value) }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Term starts" type="date" value={form.termStart} onChange={set('termStart')} error={errors.termStart} />
          <Input label="Term ends" type="date" value={form.termEnd} onChange={set('termEnd')} error={errors.termEnd} />
        </div>
        <p className="text-xs text-slate-500">The president position grants the Admin role and the treasurer position grants the Treasurer role while the term is active.</p>
      </form>
    </Modal>
  );
}

export default function Leadership() {
  const toast = useToast();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useFetch(() => leadershipApi.list({ all: isAdmin ? true : undefined }), [isAdmin]);
  const users = useFetch(() => tasksApi.assignees({}), [], { enabled: isAdmin });

  const toggle = async (row) => {
    try {
      await leadershipApi.update(row.id, { isActive: !row.isActive });
      toast.success(row.isActive ? 'Term ended' : 'Term reactivated');
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'user',
      header: 'Officer',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.user?.name}</p>
          <p className="text-xs text-slate-500">{row.user?.email}</p>
        </div>
      ),
    },
    { key: 'position', header: 'Position', render: (row) => <Badge tone="blue">{humanize(row.position)}</Badge> },
    { key: 'term', header: 'Term', render: (row) => `${formatDate(row.termStart)} to ${formatDate(row.termEnd)}` },
    { key: 'isActive', header: 'Status', render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Current' : 'Past'}</Badge> },
    ...(isAdmin
      ? [{
          key: 'actions',
          header: '',
          render: (row) => (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => toggle(row)}>{row.isActive ? 'End term' : 'Reactivate'}</Button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Leadership"
        subtitle="Elected officers by term."
        actions={isAdmin && <Button icon={FiPlus} onClick={() => setAdding(true)}>Add officer</Button>}
      />
      <Card padded={false}>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Table columns={columns} rows={data} loading={loading} emptyIcon={FiAward} emptyTitle="No officers recorded" emptyMessage="Add the elected officers for the current term." />
        )}
      </Card>
      {adding && <LeadershipForm users={users.data} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </>
  );
}
