import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAward, FiUserCheck } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { membershipsApi } from '../../api/memberships.api';
import MembershipCard from '../../components/feature/MembershipCard';
import PaymentDisclaimer from '../../components/feature/PaymentDisclaimer';
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
      {tiers.map((tier) => (
        <button
          key={tier.id}
          type="button"
          role="radio"
          aria-checked={value === tier.id}
          onClick={() => onChange(tier.id)}
          className={`rounded-xl border p-4 text-left transition ${value === tier.id ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-slate-200 bg-white hover:border-primary-300'}`}
        >
          <p className="font-semibold text-slate-900">{tier.name}</p>
          <p className="text-lg font-bold text-primary-700">{formatCurrency(tier.duesAmount)} <span className="text-xs font-normal text-slate-500">/ year</span></p>
          <p className="mt-1 text-xs text-slate-600">{tier.perksText}</p>
          {tier.merchDiscountPercent > 0 && <p className="mt-1 text-xs font-medium text-primary-700">{tier.merchDiscountPercent}% off merchandise</p>}
        </button>
      ))}
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
    if (!form.department.trim()) found.department = 'Enter your department';
    if (!/^\+?[0-9 ()-]{7,15}$/.test(form.phone.trim())) found.phone = 'Enter a valid phone number';
    if (!tierId) found.tierId = 'Choose a tier';
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
      toast.success('Welcome to the club. Your membership is active.');
      await onJoined();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Join the club" subtitle="Members get cheaper tickets, merchandise discounts and email announcements.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <TierPicker tiers={tiers} value={tierId} onChange={setTierId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Student ID" value={form.studentId} onChange={set('studentId')} error={errors.studentId} />
          <Input label="Department" value={form.department} onChange={set('department')} error={errors.department} />
          <Input label="Year of study" type="number" min="1" max="6" value={form.year} onChange={set('year')} error={errors.year} />
          <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        </div>
        <PaymentDisclaimer />
        <Button type="submit" loading={saving}>Pay {tier ? formatCurrency(tier.duesAmount) : ''} and join</Button>
      </form>
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
      toast.success('Membership renewed for another year');
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
      title="Renew membership"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={renew} loading={saving}>Pay {tier ? formatCurrency(tier.duesAmount) : ''} and renew</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Renewing adds 12 months to your current expiry date, so you lose nothing by renewing early.</p>
        <TierPicker tiers={tiers} value={tierId} onChange={setTierId} />
        <PaymentDisclaimer />
      </div>
    </Modal>
  );
}

export default function MyProfile() {
  const { user, refreshMe } = useAuth();
  const tiers = useFetch(() => membershipsApi.tiers(), []);
  const [renewOpen, setRenewOpen] = useState(false);
  const member = user?.member;
  const positions = (user?.leadership ?? []).filter((item) => item.isActive !== false);

  return (
    <>
      <PageHeader title="My profile" subtitle={`${user?.name} - ${user?.email}`} actions={<Badge tone="blue">{humanize(user?.role)}</Badge>} />

      {tiers.loading && <Skeleton className="h-56 w-full" />}
      {tiers.error && <ErrorState message={tiers.error} onRetry={tiers.reload} />}

      {tiers.data && !member && <JoinForm tiers={tiers.data} onJoined={refreshMe} />}

      {tiers.data && member && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <MembershipCard member={member} name={user.name} onRenew={() => setRenewOpen(true)} />
          <div className="space-y-5">
            <Card title="Membership details">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">Student ID</dt><dd className="font-medium">{member.studentId}</dd></div>
                <div><dt className="text-slate-500">Department</dt><dd className="font-medium">{member.department ?? '-'}</dd></div>
                <div><dt className="text-slate-500">Year</dt><dd className="font-medium">{member.year ?? '-'}</dd></div>
                <div><dt className="text-slate-500">Member since</dt><dd className="font-medium">{formatDate(member.joinedAt)}</dd></div>
                <div><dt className="text-slate-500">Dues</dt><dd><Badge tone={member.duesPaid ? 'green' : 'amber'}>{member.duesPaid ? 'Paid' : 'Unpaid'}</Badge></dd></div>
                <div><dt className="text-slate-500">Merch discount</dt><dd className="font-medium">{member.tier?.merchDiscountPercent ?? 0}%</dd></div>
              </dl>
              {member.tier?.perksText && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{member.tier.perksText}</p>}
            </Card>
            {positions.length > 0 && (
              <Card title="Club leadership">
                <ul className="space-y-2 text-sm">
                  {positions.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <FiAward className="text-primary-600" aria-hidden="true" /> {humanize(item.position)} until {formatDate(item.termEnd)}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <FiUserCheck className="text-primary-600" aria-hidden="true" />
                Show your QR ticket at the door. Volunteers see your membership status when they scan it.
                <Link className="font-medium text-primary-700 hover:underline" to="/me/tickets">My tickets</Link>
              </p>
            </Card>
          </div>
        </div>
      )}

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
    </>
  );
}
