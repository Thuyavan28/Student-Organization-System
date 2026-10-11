import { useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuLock, LuPencil, LuPlus, LuRefreshCw, LuSearch, LuShieldCheck, LuUserCheck, LuUserX, LuUsers } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { usersApi } from '../../api/users.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { humanize } from '../../utils/constants';
import { formatDate } from '../../utils/formatDate';

const STAFF_ROLES = ['TREASURER', 'VOLUNTEER'];
const ROLE_OPTIONS = STAFF_ROLES.map((value) => ({ value, label: humanize(value) }));

const randomInt = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

// Random 12 character password with upper, lower, digit and symbol, using the browser's secure RNG.
function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%&*!'];
  const all = sets.join('');
  const pick = (chars) => chars[randomInt(chars.length)];
  const chars = [...sets.map(pick), ...Array.from({ length: 8 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function PasswordField({ value, onChange, error, label, helpText }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Password copied');
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  };
  return (
    <Input
      id="staff-password"
      label={label}
      type="text"
      autoComplete="off"
      icon={LuLock}
      value={value}
      onChange={onChange}
      error={error}
      helpText={helpText}
      trailing={
        <span className="flex items-center">
          <button type="button" onClick={() => onChange({ target: { value: generatePassword() } })} aria-label="Generate password" title="Generate password" className="rounded-lg p-2 text-cf-muted hover:bg-cf-hover hover:text-cf-fg">
            <LuRefreshCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={copy} disabled={!value} aria-label="Copy password" title="Copy password" className="rounded-lg p-2 text-cf-muted hover:bg-cf-hover hover:text-cf-fg disabled:opacity-40">
            <LuCopy className="h-4 w-4" />
          </button>
        </span>
      }
    />
  );
}

function StaffFormModal({ staff, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(staff);
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    role: staff?.role ?? 'VOLUNTEER',
    password: editing ? '' : generatePassword(),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a name';
    if (!editing && !/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email address';
    if ((!editing || form.password) && form.password.length < 8) found.password = 'Use at least 8 characters';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name.trim(), role: form.role };
        if (form.password) body.password = form.password;
        await usersApi.updateStaff(staff.id, body);
        toast.success('Account updated');
        onSaved();
      } else {
        await usersApi.createStaff({ name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
        setCreated({ email: form.email.trim(), password: form.password, role: form.role });
      }
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    const text = `ClubFlow login\nEmail: ${created.email}\nPassword: ${created.password}`;
    return (
      <Modal open title="Account created" onClose={onSaved} footer={<Button onClick={onSaved}>Done</Button>}>
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-medium text-cf-fg">
            <LuCheck className="h-4 w-4 text-cf-success" aria-hidden="true" /> {humanize(created.role)} account is ready.
          </p>
          <div className="rounded-xl border border-cf-border p-4 text-sm">
            <p><span className="text-cf-muted">Email:</span> <span className="font-medium">{created.email}</span></p>
            <p className="mt-1"><span className="text-cf-muted">Password:</span> <span className="font-mono font-medium">{created.password}</span></p>
          </div>
          <p className="text-xs text-cf-muted">This password is shown only once. Share it securely; they can log in with it right away.</p>
          <Button
            variant="secondary"
            icon={LuCopy}
            onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Login details copied'), () => toast.error('Could not copy'))}
          >
            Copy login details
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={editing ? 'Edit staff account' : 'Create staff account'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="staff-form" loading={saving}>{editing ? 'Save changes' : 'Create account'}</Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} noValidate className="space-y-4">
        <Input id="staff-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input id="staff-email" label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} disabled={editing} />
        <Select id="staff-role" label="Role" value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
        <PasswordField
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          label={editing ? 'New password (optional)' : 'Temporary password'}
          helpText={editing ? 'Leave blank to keep the current password.' : 'Generated for you. You can change it before creating the account.'}
        />
      </form>
    </Modal>
  );
}

export default function Staff() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [formState, setFormState] = useState(null);
  const [toggle, setToggle] = useState(null);
  const [working, setWorking] = useState(false);

  const all = useFetch(() => usersApi.listStaff(), [], { key: 'staff-all' });
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (all.data ?? []).filter((user) => {
      if (role && user.role !== role) return false;
      if (status && user.isActive !== (status === 'active')) return false;
      return !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    });
  }, [all.data, search, role, status]);

  const count = (predicate) => (all.data ?? []).filter(predicate).length;

  const confirmToggle = async () => {
    setWorking(true);
    try {
      await usersApi.updateStaff(toggle.id, { isActive: !toggle.isActive });
      toast.success(toggle.isActive ? 'Account deactivated' : 'Account reactivated');
      setToggle(null);
      all.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff accounts"
        subtitle="Create and manage treasurer and volunteer logins. Members sign up on their own."
        actions={<Button icon={LuPlus} onClick={() => setFormState({ staff: null })}>Create staff account</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Treasurers" value={count((u) => u.role === 'TREASURER')} sub="Finance access" icon={LuShieldCheck} loading={all.loading && !all.data} />
        <StatCard label="Volunteers" value={count((u) => u.role === 'VOLUNTEER')} sub="Check-in and expenses" icon={LuUsers} loading={all.loading && !all.data} />
        <StatCard label="Active" value={count((u) => u.isActive)} sub="Can log in" icon={LuUserCheck} loading={all.loading && !all.data} />
        <StatCard label="Deactivated" value={count((u) => !u.isActive)} sub="Login blocked" icon={LuUserX} loading={all.loading && !all.data} />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-cf-divider p-4">
          <div className="relative min-w-[14rem] flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-muted" />
            <input
              type="text"
              aria-label="Search staff"
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-base pl-9"
            />
          </div>
          <div className="w-40">
            <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="All roles" options={[{ value: 'ADMIN', label: 'Admin' }, ...ROLE_OPTIONS]} />
          </div>
          <div className="w-40">
            <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Deactivated' }]} />
          </div>
        </div>

        {all.error ? (
          <ErrorState message={all.error} onRetry={all.reload} />
        ) : all.loading && !all.data ? (
          <div className="space-y-3 p-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={LuUsers} title="No staff accounts found" message="Create a treasurer or volunteer account, or adjust the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cf-fg/80 text-xs font-semibold text-cf-fg">
                <tr>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-divider">
                {rows.map((user) => {
                  const locked = user.role === 'ADMIN';
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-cf-hover">
                      <td className="px-4 py-3 font-medium text-cf-fg">{user.name}</td>
                      <td className="px-4 py-3 text-cf-muted">{user.email}</td>
                      <td className="px-4 py-3"><Badge tone="gray">{humanize(user.role)}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'Active' : 'Deactivated'}</Badge></td>
                      <td className="px-4 py-3 text-cf-muted">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span className="flex items-center justify-end gap-1.5 text-xs text-cf-muted"><LuLock className="h-3.5 w-3.5" /> Protected</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" icon={LuPencil} onClick={() => setFormState({ staff: user })}>Edit</Button>
                            <Button size="sm" variant="secondary" icon={user.isActive ? LuUserX : LuUserCheck} onClick={() => setToggle(user)}>
                              {user.isActive ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formState && (
        <StaffFormModal
          staff={formState.staff}
          onClose={() => setFormState(null)}
          onSaved={() => { setFormState(null); all.reload(); }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toggle)}
        title={toggle?.isActive ? `Deactivate ${toggle?.name}?` : `Reactivate ${toggle?.name}?`}
        message={toggle?.isActive ? 'They will be unable to sign in until you reactivate the account.' : 'They will be able to sign in again.'}
        confirmLabel={toggle?.isActive ? 'Deactivate' : 'Reactivate'}
        variant={toggle?.isActive ? 'danger' : 'primary'}
        loading={working}
        onConfirm={confirmToggle}
        onCancel={() => setToggle(null)}
      />
    </div>
  );
}
