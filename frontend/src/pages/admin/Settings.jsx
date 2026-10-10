import { useState } from 'react';
import { FiEdit2, FiPlay, FiPlus } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { membersApi } from '../../api/members.api';
import { membershipsApi } from '../../api/memberships.api';
import PaymentDisclaimer from '../../components/feature/PaymentDisclaimer';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { formatCurrency, toPaise, toRupeesInput } from '../../utils/formatCurrency';

function TierForm({ tier, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(tier);
  const [form, setForm] = useState({
    name: tier?.name ?? '',
    dues: tier ? toRupeesInput(tier.duesAmount) : '',
    merchDiscountPercent: String(tier?.merchDiscountPercent ?? 0),
    perksText: tier?.perksText ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a tier name';
    if (form.dues === '' || toPaise(form.dues) < 0) found.dues = 'Enter the yearly dues';
    const percent = Number(form.merchDiscountPercent);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) found.merchDiscountPercent = 'Use a whole number from 0 to 100';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        duesAmount: toPaise(form.dues),
        merchDiscountPercent: percent,
        perksText: form.perksText.trim(),
      };
      if (editing) await membershipsApi.updateTier(tier.id, payload);
      else await membershipsApi.createTier(payload);
      toast.success(editing ? 'Tier updated' : 'Tier created');
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
      title={editing ? `Edit ${tier.name}` : 'New membership tier'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="tier-form" loading={saving}>{editing ? 'Save changes' : 'Create tier'}</Button>
        </>
      }
    >
      <form id="tier-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Yearly dues (Rs)" type="number" min="0" step="0.01" value={form.dues} onChange={set('dues')} error={errors.dues} />
          <Input label="Merchandise discount (%)" type="number" min="0" max="100" value={form.merchDiscountPercent} onChange={set('merchDiscountPercent')} error={errors.merchDiscountPercent} />
        </div>
        <Input label="Perks" as="textarea" rows={3} value={form.perksText} onChange={set('perksText')} />
        <p className="text-xs text-slate-500">Every tier lasts 12 months. Members pay the member price on tickets regardless of tier.</p>
      </form>
    </Modal>
  );
}

export default function Settings() {
  const toast = useToast();
  const [formState, setFormState] = useState(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const tiers = useFetch(() => membershipsApi.tiers(), []);

  const runJob = async () => {
    setRunning(true);
    try {
      const body = await membersApi.runReminders();
      setLastRun({ ...body.data, at: new Date() });
      toast.success('Expiry check finished');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Tier', render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: 'duesAmount', header: 'Yearly dues', className: 'tabular-nums', render: (row) => formatCurrency(row.duesAmount) },
    { key: 'merchDiscountPercent', header: 'Merch discount', render: (row) => `${row.merchDiscountPercent}%` },
    { key: 'perksText', header: 'Perks', render: (row) => <span className="block max-w-sm text-xs text-slate-600">{row.perksText}</span> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => setFormState({ tier: row })} aria-label={`Edit ${row.name}`} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Membership tiers and scheduled jobs." />
      <div className="space-y-6">
        <Card
          title="Membership tiers"
          padded={false}
          actions={<Button size="sm" icon={FiPlus} onClick={() => setFormState({ tier: null })}>New tier</Button>}
        >
          {tiers.error ? <ErrorState message={tiers.error} onRetry={tiers.reload} /> : <Table columns={columns} rows={tiers.data} loading={tiers.loading} emptyTitle="No tiers yet" />}
        </Card>

        <Card title="Membership expiry job" subtitle="Runs automatically every day. Run it now to expire lapsed memberships and send renewal reminders.">
          <div className="flex flex-wrap items-center gap-4">
            <Button icon={FiPlay} loading={running} onClick={runJob}>Run now</Button>
            {lastRun && (
              <p className="text-sm text-slate-600">
                Last run: {lastRun.expired} memberships expired, {lastRun.remindersSent} reminders sent.
              </p>
            )}
          </div>
        </Card>

        <Card title="Payments">
          <PaymentDisclaimer />
          <p className="mt-3 text-sm text-slate-600">Every payment in ClubFlow is recorded with payment mode SIMULATED. No payment gateway is connected.</p>
        </Card>
      </div>
      {formState && <TierForm tier={formState.tier} onClose={() => setFormState(null)} onSaved={() => { setFormState(null); tiers.reload(); }} />}
    </>
  );
}
