import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuAward,
  LuUserCheck,
  LuTicket,
  LuShoppingBag,
  LuCalendar,
  LuGift,
  LuShieldCheck,
  LuMail,
  LuPhone,
  LuGraduationCap,
  LuRefreshCw,
  LuCreditCard,
  LuCheck,
  LuArrowRight,
  LuClipboardList,
  LuBell,
  LuClipboard,
  LuDollarSign,
  LuFileText,
  LuLayoutDashboard,
  LuPackage,
  LuSettings,
  LuSquareCheck,
  LuUserCog,
  LuUsers,
} from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { membershipsApi } from '../../api/memberships.api';
import MembershipCard from '../../components/feature/MembershipCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

function TierPicker({ tiers, value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Membership tier">
      {tiers.map((tier) => {
        const selected = value === tier.id;
        return (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(tier.id)}
            className={`relative rounded-2xl border p-4 text-left transition-all ${
              selected
                ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20'
                : 'border-cf-divider bg-white hover:border-cf-fg text-cf-fg'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{tier.name}</p>
              {selected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                  <LuCheck className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </div>

            <p className={`mt-1 text-xl font-extrabold ${selected ? 'text-white' : 'text-cf-fg'}`}>
              {formatCurrency(tier.duesAmount)}{' '}
              <span className={`text-xs font-normal ${selected ? 'text-slate-300' : 'text-cf-muted'}`}>
                / year
              </span>
            </p>

            <p className={`mt-2 text-xs leading-relaxed ${selected ? 'text-slate-200' : 'text-cf-muted'}`}>
              {tier.perksText}
            </p>

            {tier.merchDiscountPercent > 0 && (
              <div className="mt-2.5">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    selected ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {tier.merchDiscountPercent}% merchandise discount
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function JoinForm({ tiers, onJoined }) {
  const toast = useToast();
  const [tierId, setTierId] = useState(tiers[0]?.id ?? null);
  const [form, setForm] = useState({ studentId: '', department: '', year: '1', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const tier = tiers.find((item) => item.id === tierId);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.studentId.trim().length < 3) found.studentId = 'Enter your student ID';
    if (!form.department.trim()) found.department = 'Enter your academic department';
    if (!/^\+?[0-9 ()-]{7,15}$/.test(form.phone.trim())) found.phone = 'Enter a valid phone number';
    if (!tierId) found.tierId = 'Choose a membership tier';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await membershipsApi.join({
        tierId,
        studentId: form.studentId.trim(),
        department: form.department.trim(),
        year: Number(form.year),
        phone: form.phone.trim(),
      });
      toast.success('Welcome to the club! Your membership is now active.');
      await onJoined();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Join Club Membership"
      subtitle="Unlock exclusive ticket discounts, merchandise savings, and members-only campus events."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-cf-muted">
            Select Your Membership Tier
          </label>
          <TierPicker tiers={tiers} value={tierId} onChange={setTierId} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Student ID / Roll No" placeholder="e.g. CS2024-042" value={form.studentId} onChange={set('studentId')} error={errors.studentId} />
          <Input label="Department / Major" placeholder="e.g. Computer Science" value={form.department} onChange={set('department')} error={errors.department} />
          <Input label="Year of Study" type="number" min="1" max="6" value={form.year} onChange={set('year')} error={errors.year} />
          <Input label="Phone Number" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} error={errors.phone} />
        </div>


        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          Pay {tier ? formatCurrency(tier.duesAmount) : ''} & Activate Membership
        </Button>
      </form>
    </Card>
  );
}

// What each staff role does and where to do it. Staff do not buy memberships, so this replaces the join/renew area for them.
const STAFF_WORKSPACE = {
  ADMIN: {
    summary: 'You have full access to run the club: people, events, money and settings.',
    links: [
      { to: '/admin', icon: LuLayoutDashboard, title: 'Dashboard', text: 'Club health at a glance' },
      { to: '/admin/staff', icon: LuUserCog, title: 'Staff accounts', text: 'Create treasurer and volunteer logins' },
      { to: '/admin/members', icon: LuUsers, title: 'Members', text: 'Memberships, dues and tiers' },
      { to: '/admin/events', icon: LuCalendar, title: 'Events', text: 'Plan events and watch ticket sales' },
      { to: '/admin/tasks', icon: LuClipboardList, title: 'Tasks', text: 'Assign event duties to volunteers' },
      { to: '/admin/announcements', icon: LuBell, title: 'Announcements', text: 'Message every member' },
      { to: '/admin/merchandise', icon: LuPackage, title: 'Merchandise', text: 'Products, sizes and stock' },
      { to: '/admin/finance', icon: LuDollarSign, title: 'Finance', text: 'Ledger, reports and exports' },
      { to: '/admin/settings', icon: LuSettings, title: 'Settings', text: 'Tiers and system jobs' },
    ],
  },
  TREASURER: {
    summary: 'You look after the club money: income, expenses, orders and reports.',
    links: [
      { to: '/admin', icon: LuLayoutDashboard, title: 'Dashboard', text: 'Income and expense overview' },
      { to: '/admin/finance', icon: LuDollarSign, title: 'Finance', text: 'Ledger, analytics and exports' },
      { to: '/admin/expenses', icon: LuFileText, title: 'Expenses', text: 'Review reimbursement claims' },
      { to: '/admin/orders', icon: LuShoppingBag, title: 'Orders', text: 'Merchandise orders and refunds' },
      { to: '/admin/tasks', icon: LuClipboardList, title: 'Tasks', text: 'See what is on track' },
      { to: '/admin/members', icon: LuUsers, title: 'Members', text: 'Dues and membership status' },
    ],
  },
  VOLUNTEER: {
    summary: 'You help on the day: check guests in, finish your tasks and claim expenses.',
    links: [
      { to: '/admin/check-in', icon: LuSquareCheck, title: 'Check-in', text: 'Scan tickets at the door' },
      { to: '/admin/tasks', icon: LuClipboardList, title: 'My tasks', text: 'Your assigned event duties' },
      { to: '/me/expenses', icon: LuClipboard, title: 'My expense claims', text: 'Claim money you spent for the club' },
    ],
  },
};

function StaffWorkspace({ role }) {
  const config = STAFF_WORKSPACE[role];
  if (!config) return null;
  return (
    <Card title={`${humanize(role)} workspace`} subtitle={config.summary}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group flex flex-col gap-3 rounded-2xl border border-cf-border p-4 transition-colors hover:bg-cf-fg hover:text-white"
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="flex items-center justify-between text-sm font-semibold">
                {item.title}
                <LuArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </p>
              <p className="mt-0.5 text-xs text-cf-muted group-hover:text-white/70">{item.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RenewModal({ open, tiers, currentTierId, onClose, onRenewed }) {
  const toast = useToast();
  const [tierId, setTierId] = useState(currentTierId ?? tiers[0]?.id);
  const [saving, setSaving] = useState(false);
  const tier = tiers.find((item) => item.id === tierId);

  const renew = async () => {
    setSaving(true);
    try {
      await membershipsApi.renew({ tierId });
      toast.success('Membership successfully renewed for another year!');
      await onRenewed();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Renew Club Membership"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={renew} loading={saving}>
            Pay {tier ? formatCurrency(tier.duesAmount) : ''} & Renew
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-cf-muted leading-relaxed">
          Renewing extends your membership to the end of the next membership year, so your benefits and discounts carry on without a break.
        </p>
        <TierPicker tiers={tiers} value={tierId} onChange={setTierId} />
      </div>
    </Modal>
  );
}

export default function MyProfile() {
  const { user, refreshMe } = useAuth();
  // Only members buy or renew a membership; staff roles get their own workspace instead.
  const isMember = user?.role === 'MEMBER';
  const tiers = useFetch(() => membershipsApi.tiers(), [], { enabled: isMember });
  const [renewOpen, setRenewOpen] = useState(false);
  const member = isMember ? user?.member : null;
  const positions = (user?.leadership ?? []).filter((item) => item.isActive !== false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6">
      {/* Top Profile Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-cf-divider bg-white p-6 ">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Circle */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-md">
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-cf-fg">{user?.name}</h1>
                <Badge tone="blue">{humanize(user?.role)}</Badge>
                {member && <Badge tone="green">Active Member</Badge>}
              </div>
              <p className="text-xs text-cf-muted mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <LuMail className="h-3.5 w-3.5" />
                  {user?.email}
                </span>
                {member?.studentId && (
                  <span className="flex items-center gap-1 font-mono">
                    <LuGraduationCap className="h-3.5 w-3.5" />
                    {member.studentId}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Fast Navigation Quick Links */}
          <div className="flex items-center gap-2">
            <Link to="/me/tickets">
              <Button size="sm" variant="secondary" icon={LuTicket}>
                My Tickets
              </Button>
            </Link>
            <Link to="/me/orders">
              <Button size="sm" variant="secondary" icon={LuShoppingBag}>
                My Orders
              </Button>
            </Link>
            {member && (
              <Button size="sm" variant="primary" icon={LuRefreshCw} onClick={() => setRenewOpen(true)}>
                Renew
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isMember && <StaffWorkspace role={user?.role} />}

      {isMember && tiers.loading && <Skeleton className="h-56 w-full rounded-2xl" />}
      {isMember && tiers.error && <ErrorState message={tiers.error} onRetry={tiers.reload} />}

      {/* Non-member Join Callout */}
      {isMember && tiers.data && !member && <JoinForm tiers={tiers.data} onJoined={refreshMe} />}

      {/* Member Details Layout */}
      {tiers.data && member && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
          {/* Left Column: Digital Membership Card */}
          <div className="space-y-4">
            <MembershipCard member={member} name={user.name} onRenew={() => setRenewOpen(true)} />

            {/* Quick Door QR Ticket Tip */}
            <div className="rounded-2xl border border-cf-divider bg-cf-subtle p-4 text-xs text-cf-muted space-y-1.5">
              <p className="flex items-center gap-1.5 font-bold text-cf-fg">
                <LuUserCheck className="h-4 w-4 text-emerald-600" />
                Fast Door Entry
              </p>
              <p className="leading-relaxed">
                Volunteers verify your active club membership status instantly when scanning your event QR ticket at the check-in desk.
              </p>
              <div className="pt-1">
                <Link to="/me/tickets" className="text-xs font-semibold text-emerald-700 hover:underline">
                  View your active event tickets →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Specs and Leadership */}
          <div className="space-y-6">
            <Card title="Membership Credentials & Perks">
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Student ID</p>
                  <p className="mt-1 font-bold text-cf-fg font-mono text-sm">{member.studentId}</p>
                </div>

                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Department</p>
                  <p className="mt-1 font-bold text-cf-fg">{member.department ?? 'General'}</p>
                </div>

                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Year of Study</p>
                  <p className="mt-1 font-bold text-cf-fg">Year {member.year ?? 1}</p>
                </div>

                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Member Since</p>
                  <p className="mt-1 font-bold text-cf-fg">{formatDate(member.joinedAt)}</p>
                </div>

                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Annual Dues</p>
                  <div className="mt-1">
                    <Badge tone={member.duesPaid ? 'green' : 'amber'}>
                      {member.duesPaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-cf-divider bg-cf-subtle p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cf-muted">Merch Discount</p>
                  <p className="mt-1 font-bold text-emerald-600 text-sm">
                    {member.tier?.merchDiscountPercent ?? 0}% OFF
                  </p>
                </div>
              </div>

              {member.tier?.perksText && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-900 flex items-start gap-2">
                  <LuGift className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tier Privileges: </span>
                    <span>{member.tier.perksText}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Club Leadership Roles if assigned */}
            {positions.length > 0 && (
              <Card title="Club Leadership & Officer Positions">
                <ul className="divide-y divide-cf-divider text-xs">
                  {positions.map((item) => (
                    <li key={item.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                          <LuAward className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-cf-fg">{humanize(item.position)}</span>
                      </div>
                      <span className="text-cf-muted">Term active until {formatDate(item.termEnd)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {tiers.data && member && (
        <RenewModal
          key={renewOpen ? 'open' : 'closed'}
          open={renewOpen}
          tiers={tiers.data}
          currentTierId={member.tierId}
          onClose={() => setRenewOpen(false)}
          onRenewed={refreshMe}
        />
      )}
    </div>
  );
}
