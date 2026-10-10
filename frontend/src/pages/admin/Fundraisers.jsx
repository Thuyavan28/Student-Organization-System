import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuHeart, LuPlus } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { fundraisersApi } from '../../api/fundraisers.api';
import FundraiserProgress from '../../components/feature/FundraiserProgress';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton, { SkeletonCards } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { FUNDRAISER_STATUSES, humanize } from '../../utils/constants';
import { toPaise, toRupeesInput } from '../../utils/formatCurrency';
import { formatDate, toDateInput } from '../../utils/formatDate';

export function FundraiserForm({ fundraiser, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(fundraiser);
  const today = new Date();
  const [form, setForm] = useState({
    title: fundraiser?.title ?? '',
    description: fundraiser?.description ?? '',
    goal: fundraiser ? toRupeesInput(fundraiser.goalAmount) : '',
    startDate: fundraiser ? toDateInput(fundraiser.startDate) : toDateInput(today),
    endDate: fundraiser ? toDateInput(fundraiser.endDate) : toDateInput(new Date(today.getTime() + 14 * 86400000)),
    status: fundraiser?.status ?? 'PLANNING',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.title.trim().length < 3) found.title = 'Enter a title';
    if (toPaise(form.goal) <= 0) found.goal = 'Enter a goal greater than zero';
    if (!form.startDate) found.startDate = 'Choose a start date';
    if (!form.endDate) found.endDate = 'Choose an end date';
    else if (form.startDate && form.endDate < form.startDate) found.endDate = 'End must not be before the start';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        goalAmount: toPaise(form.goal),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };
      if (editing) await fundraisersApi.update(fundraiser.id, payload);
      else await fundraisersApi.create(payload);
      toast.success(editing ? 'Fundraiser updated' : 'Fundraiser created');
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
      title={editing ? 'Edit fundraiser' : 'New fundraiser'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="fundraiser-form" loading={saving}>{editing ? 'Save changes' : 'Create fundraiser'}</Button>
        </>
      }
    >
      <form id="fundraiser-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" value={form.title} onChange={set('title')} error={errors.title} />
        <Input className="sm:col-span-2" label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} />
        <Input label="Goal (Rs)" type="number" min="0" step="0.01" value={form.goal} onChange={set('goal')} error={errors.goal} />
        <Select label="Status" value={form.status} onChange={set('status')} options={FUNDRAISER_STATUSES.map((value) => ({ value, label: humanize(value) }))} />
        <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} error={errors.startDate} />
        <Input label="End date" type="date" value={form.endDate} onChange={set('endDate')} error={errors.endDate} />
      </form>
    </Modal>
  );
}

function FundraiserCard({ fundraiser }) {
  const summary = useFetch(() => fundraisersApi.summary(fundraiser.id), [fundraiser.id]);
  return (
    <Card
      title={fundraiser.title}
      subtitle={`${formatDate(fundraiser.startDate)} to ${formatDate(fundraiser.endDate)}`}
      actions={<Badge status={fundraiser.status} />}
    >
      <p className="mb-4 line-clamp-2 text-sm text-slate-600">{fundraiser.description}</p>
      {summary.loading && <Skeleton className="h-24 w-full" />}
      {summary.error && <p className="text-sm text-red-600">{summary.error}</p>}
      {summary.data && <FundraiserProgress summary={summary.data} compact />}
      <Link to={`/admin/fundraisers/${fundraiser.id}`} className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline">
        Open task board
      </Link>
    </Card>
  );
}

export default function Fundraisers() {
  const { hasRole } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useFetch(() => fundraisersApi.list({ pageSize: 50 }), []);

  return (
    <>
      <PageHeader
        title="Fundraisers"
        subtitle="Goals, progress and the work behind each campaign."
        actions={hasRole('ADMIN') && <Button icon={LuPlus} onClick={() => setCreating(true)}>New fundraiser</Button>}
      />
      {loading && <SkeletonCards count={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState
          icon={LuHeart}
          title="No fundraisers yet"
          message="Create a fundraiser, split it into tasks and assign volunteers."
          action={hasRole('ADMIN') && <Button icon={LuPlus} onClick={() => setCreating(true)}>New fundraiser</Button>}
        />
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((fundraiser) => (
          <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
        ))}
      </div>
      {creating && <FundraiserForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </>
  );
}
