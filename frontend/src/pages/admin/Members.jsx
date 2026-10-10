import { useState } from 'react';
import { FiBell, FiEdit2, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { membersApi } from '../../api/members.api';
import { membershipsApi } from '../../api/memberships.api';
import PaymentDisclaimer from '../../components/feature/PaymentDisclaimer';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { MEMBERSHIP_STATUSES, humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { daysUntil, formatDate } from '../../utils/formatDate';

const SORT_FIELDS = { name: 'name', studentId: 'studentId', joinedAt: 'joinedAt', expiresAt: 'expiresAt' };
const EMPTY_FORM = {
  name: '', email: '', password: 'Password@123', studentId: '', department: '', year: '1', phone: '', tierId: '', markPaid: true,
};

function MemberForm({ member, tiers, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(member);
  const [form, setForm] = useState(
    editing
      ? {
          department: member.department ?? '',
          year: String(member.year ?? 1),
          phone: member.phone ?? '',
          tierId: String(member.tierId ?? ''),
          membershipStatus: member.membershipStatus,
        }
      : { ...EMPTY_FORM, tierId: String(tiers[0]?.id ?? '') },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!editing) {
      if (form.name.trim().length < 2) found.name = 'Enter a name';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email';
      if (form.password.length < 8) found.password = 'Use at least 8 characters';
      if (form.studentId.trim().length < 3) found.studentId = 'Enter a student ID';
    }
    if (!form.tierId) found.tierId = 'Choose a tier';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const payload = { ...form, year: Number(form.year), tierId: Number(form.tierId) };
      if (editing) await membersApi.update(member.id, payload);
      else await membersApi.create(payload);
      toast.success(editing ? 'Member updated' : 'Member added');
      onSaved();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const tierOptions = tiers.map((tier) => ({ value: tier.id, label: `${tier.name} (${formatCurrency(tier.duesAmount)})` }));

  return (
    <Modal
      open
      title={editing ? `Edit ${member.user?.name}` : 'Add member'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="member-form" loading={saving}>{editing ? 'Save changes' : 'Add member'}</Button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!editing && (
          <>
            <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Initial password" value={form.password} onChange={set('password')} error={errors.password} />
            <Input label="Student ID" value={form.studentId} onChange={set('studentId')} error={errors.studentId} />
          </>
        )}
        <Input label="Department" value={form.department} onChange={set('department')} error={errors.department} />
        <Input label="Year" type="number" min="1" max="6" value={form.year} onChange={set('year')} error={errors.year} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Select label="Tier" value={form.tierId} onChange={set('tierId')} options={tierOptions} placeholder="Select a tier" error={errors.tierId} />
        {editing && (
          <Select
            label="Membership status"
            value={form.membershipStatus}
            onChange={set('membershipStatus')}
            options={MEMBERSHIP_STATUSES.map((value) => ({ value, label: humanize(value) }))}
          />
        )}
        {!editing && (
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.markPaid}
              onChange={(event) => setForm((current) => ({ ...current, markPaid: event.target.checked }))}
            />
            Record dues as paid now (simulated payment)
          </label>
        )}
        {!editing && form.markPaid && <PaymentDisclaimer className="sm:col-span-2" />}
      </form>
    </Modal>
  );
}

export default function Members() {
  const toast = useToast();
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tierId, setTierId] = useState('');
  const [sort, setSort] = useState({ key: 'name', order: 'asc' });
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [working, setWorking] = useState(false);
  const q = useDebounce(search);

  const tiers = useFetch(() => membershipsApi.tiers(), []);
  const list = useFetch(
    () =>
      tab === 'expiring'
        ? membersApi.expiring({ days: 30 })
        : membersApi.list({
            q: q || undefined,
            status: status || undefined,
            tierId: tierId || undefined,
            sort: SORT_FIELDS[sort.key],
            order: sort.order,
            page,
            pageSize: 15,
          }),
    [tab, q, status, tierId, sort.key, sort.order, page],
  );

  const toggleSort = (key) => {
    setSort((current) => ({ key, order: current.key === key && current.order === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const markPaid = async () => {
    setWorking(true);
    try {
      await membersApi.markPaid(payTarget.id, { tierId: payTarget.tierId ?? undefined });
      toast.success(`Dues recorded for ${payTarget.user?.name}. Membership extended by 12 months.`);
      setPayTarget(null);
      list.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  const runReminders = async () => {
    try {
      const body = await membersApi.runReminders();
      toast.success(`Expiry check done: ${body.data.expired} expired, ${body.data.remindersSent} reminders sent`);
      list.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Member',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.user?.name}</p>
          <p className="text-xs text-slate-500">{row.user?.email}</p>
        </div>
      ),
    },
    { key: 'studentId', header: 'Student ID', sortable: true },
    { key: 'tier', header: 'Tier', render: (row) => row.tier?.name ?? '-' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : row.membershipStatus === 'ACTIVE' ? 'EXPIRED' : row.membershipStatus} />,
    },
    { key: 'duesPaid', header: 'Dues', render: (row) => <Badge tone={row.duesPaid ? 'green' : 'amber'}>{row.duesPaid ? 'Paid' : 'Unpaid'}</Badge> },
    {
      key: 'expiresAt',
      header: 'Expires',
      sortable: true,
      render: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <div>
            <p>{formatDate(row.expiresAt)}</p>
            {days != null && days > 0 && days <= 30 && <p className="text-xs font-medium text-amber-700">{days} days left</p>}
          </div>
        );
      },
    },
    ...(canEdit
      ? [{
          key: 'actions',
          header: '',
          render: (row) => (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="secondary" onClick={() => setPayTarget(row)}>Mark paid / renew</Button>
              <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => setFormState({ member: row })} aria-label={`Edit ${row.user?.name}`} />
            </div>
          ),
        }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Search, filter and manage club memberships."
        actions={
          canEdit && (
            <>
              <Button variant="secondary" icon={FiBell} onClick={runReminders}>Run expiry check</Button>
              <Button icon={FiPlus} onClick={() => setFormState({ member: null })} disabled={!tiers.data}>Add member</Button>
            </>
          )
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist">
            {[['all', 'All members'], ['expiring', 'Expiring soon']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => { setTab(value); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === value ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'all' && (
            <>
              <div className="relative min-w-[12rem] flex-1">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  aria-label="Search members"
                  className="[&_input]:pl-9"
                  placeholder="Search name, email or student ID"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                />
              </div>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                placeholder="All statuses"
                options={MEMBERSHIP_STATUSES.map((value) => ({ value, label: humanize(value) }))}
              />
              <Select
                aria-label="Filter by tier"
                value={tierId}
                onChange={(event) => { setTierId(event.target.value); setPage(1); }}
                placeholder="All tiers"
                options={(tiers.data ?? []).map((tier) => ({ value: tier.id, label: tier.name }))}
              />
            </>
          )}
        </div>
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={list.data}
              loading={list.loading}
              sort={sort}
              onSort={toggleSort}
              emptyIcon={FiUsers}
              emptyTitle={tab === 'expiring' ? 'No memberships expiring soon' : 'No members match these filters'}
              emptyMessage="Adjust the search or filters to see more members."
            />
            {tab === 'all' && <Pagination meta={list.meta} onPage={setPage} />}
          </>
        )}
      </Card>

      {formState && tiers.data && (
        <MemberForm
          member={formState.member}
          tiers={tiers.data}
          onClose={() => setFormState(null)}
          onSaved={() => { setFormState(null); list.reload(); }}
        />
      )}

      <ConfirmDialog
        open={Boolean(payTarget)}
        title="Record dues and extend membership"
        message={
          <span className="space-y-3 block">
            <span className="block">
              Mark dues as paid for {payTarget?.user?.name} on the {payTarget?.tier?.name} tier ({formatCurrency(payTarget?.tier?.duesAmount ?? 0)}).
              Membership is extended by 12 months from the later of today and the current expiry.
            </span>
            <PaymentDisclaimer />
          </span>
        }
        confirmLabel="Record payment"
        loading={working}
        onConfirm={markPaid}
        onCancel={() => setPayTarget(null)}
      />
    </>
  );
}
