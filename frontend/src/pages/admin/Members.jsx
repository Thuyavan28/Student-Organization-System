import { useState } from 'react';
import { LuBell, LuPencil, LuPlus, LuSearch, LuUsers } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { membersApi } from '../../api/members.api';
import { useMembersList, useMembersStats, useCreateMember, useUpdateMember, useMarkMemberPaid } from '../../hooks/queries/members.queries';
import { useMembershipTiers } from '../../hooks/queries/memberships.queries';
import PaymentDisclaimer from '../../components/feature/PaymentDisclaimer';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataCard from '../../components/ui/DataCard';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterCard, { FilterField } from '../../components/ui/FilterCard';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import StatCardSkeleton from '../../components/ui/skeletons/StatCardSkeleton';
import TableSkeleton from '../../components/ui/skeletons/TableSkeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { MEMBERSHIP_STATUSES, humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { daysUntil, formatDate } from '../../utils/formatDate';

const EMPTY_FORM = {
  name: '', email: '', password: 'Password@123', studentId: '', department: '', year: '1', phone: '', tierId: '', markPaid: true,
};

function MemberForm({ member, tiers, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(member);
  const [form, setForm] = useState(
    editing
      ? { department: member.department ?? '', year: String(member.year ?? 1), phone: member.phone ?? '', tierId: String(member.tierId ?? ''), membershipStatus: member.membershipStatus }
      : { ...EMPTY_FORM, tierId: String(tiers[0]?.id ?? '') },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((c) => ({ ...c, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setErrors(apiFieldErrors(err));
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit member' : 'Add member'} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!editing && (
          <>
            <Input id="m-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
            <Input id="m-email" label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input id="m-password" label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} />
            <Input id="m-sid" label="Student ID" value={form.studentId} onChange={set('studentId')} error={errors.studentId} />
            <PaymentDisclaimer />
          </>
        )}
        <Input id="m-dept" label="Department" value={form.department} onChange={set('department')} />
        <Input id="m-year" label="Year" type="number" min="1" max="6" value={form.year} onChange={set('year')} />
        <Input id="m-phone" label="Phone" value={form.phone} onChange={set('phone')} />
        <Select id="m-tier" label="Membership tier" value={form.tierId} onChange={set('tierId')} error={errors.tierId}>
          <option value="">Select tier</option>
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.duesAmount)})</option>)}
        </Select>
        {editing && (
          <Select id="m-status" label="Status" value={form.membershipStatus} onChange={set('membershipStatus')}>
            {MEMBERSHIP_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </Select>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>{editing ? 'Save changes' : 'Add member'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Members() {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'markPaid'
  const [selected, setSelected] = useState(null);
  const [confirmRemind, setConfirmRemind] = useState(false);
  const [reminding, setReminding] = useState(false);
  const dq = useDebounce(q, 350);

  const params = { q: dq || undefined, status: status || undefined, page, limit: 15 };
  const { data: listData, isLoading, error, refetch } = useMembersList(params);
  const { data: statsData, isLoading: statsLoading } = useMembersStats();
  const { data: tiersData } = useMembershipTiers();

  const rows = listData?.data ?? [];
  const meta = listData?.meta ?? null;
  const stats = statsData?.data;
  const tiers = tiersData?.data ?? [];

  const isAdmin = user?.role === 'ADMIN';

  const runReminders = async () => {
    setReminding(true);
    try {
      await membersApi.runReminders();
      toast.success('Reminder emails sent');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setReminding(false);
      setConfirmRemind(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage club membership and dues"
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="secondary" size="sm" icon={LuBell} onClick={() => setConfirmRemind(true)}>
                Send reminders
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" icon={LuPlus} onClick={() => { setSelected(null); setModal('add'); }}>
                Add member
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      {statsLoading ? (
        <StatCardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
          <StatCard label="Total members" value={stats?.total} icon={LuUsers} />
          <StatCard label="Active" value={stats?.active} icon={LuUsers} tone="success" />
          <StatCard label="Expiring in 30 days" value={stats?.expiringSoon} icon={LuUsers} tone="warning" />
        </div>
      )}

      {/* filter */}
      <FilterCard className="mb-6">
        <FilterField label="Search" htmlFor="m-search" className="flex-1 min-w-[200px]">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-muted" />
            <input
              id="m-search"
              className="input-base pl-9"
              placeholder="Name, email, student ID..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
        </FilterField>
        <FilterField label="Status" htmlFor="m-status-filter">
          <Select id="m-status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
            <option value="">All statuses</option>
            {MEMBERSHIP_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </Select>
        </FilterField>
      </FilterCard>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : error ? (
        <ErrorState error={error.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={LuUsers} title="No members found" message="Try adjusting your filters." />
      ) : (
        <DataCard title={`${meta?.total ?? 0} members`}>
          <Table>
            <Thead>
              <Th>Name</Th>
              <Th>Student ID</Th>
              <Th>Tier</Th>
              <Th>Status</Th>
              <Th>Expires</Th>
              <Th />
            </Thead>
            <Tbody>
              {rows.map((m) => {
                const days = m.expiresAt ? daysUntil(m.expiresAt) : null;
                return (
                  <Tr key={m.id}>
                    <Td>
                      <p className="font-medium text-cf-fg">{m.user?.name}</p>
                      <p className="text-xs text-cf-muted">{m.user?.email}</p>
                    </Td>
                    <Td muted>{m.studentId}</Td>
                    <Td muted>{m.tier?.name ?? '-'}</Td>
                    <Td><Badge status={m.membershipStatus} /></Td>
                    <Td muted>
                      {m.expiresAt ? (
                        <span className={days !== null && days <= 30 ? 'text-cf-warning font-medium' : ''}>
                          {formatDate(m.expiresAt)}
                        </span>
                      ) : '-'}
                    </Td>
                    <Td right>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => { setSelected(m); setModal('edit'); }}
                          className="rounded-lg p-1.5 text-cf-muted hover:bg-cf-hover hover:text-cf-fg transition-colors"
                          aria-label={`Edit ${m.user?.name}`}
                        >
                          <LuPencil className="h-4 w-4" />
                        </button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <Pagination meta={meta} onChange={setPage} />
        </DataCard>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <MemberForm
          member={modal === 'edit' ? selected : null}
          tiers={tiers}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={confirmRemind}
        title="Send reminder emails?"
        message="Members with memberships expiring in 30 days will receive an email reminder."
        confirmLabel="Send reminders"
        onConfirm={runReminders}
        onCancel={() => setConfirmRemind(false)}
        loading={reminding}
        variant="primary"
      />
    </div>
  );
}
