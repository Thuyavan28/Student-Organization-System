import { LuRefreshCw, LuZap } from 'react-icons/lu';
import { daysUntil, formatDate } from '../../utils/formatDate';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export function memberCode(member) {
  return `SKY-${String(member.id).padStart(4, '0')}`;
}

export default function MembershipCard({ member, name, onRenew }) {
  const days = daysUntil(member.expiresAt);
  const active = member.isActive ?? (member.membershipStatus === 'ACTIVE' && days > 0);
  const displayStatus = active ? 'ACTIVE' : member.membershipStatus === 'ACTIVE' ? 'EXPIRED' : member.membershipStatus;
  const daysTone = days == null ? 'text-slate-200' : days <= 0 ? 'text-red-200' : days <= 30 ? 'text-amber-200' : 'text-emerald-200';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-5 text-white shadow-lg sm:p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-100">
          <LuZap aria-hidden="true" /> Skyline Student Association
        </div>
        <Badge status={displayStatus} />
      </div>
      <div className="mt-8">
        <p className="text-xs uppercase tracking-wide text-primary-200">Member</p>
        <p className="text-2xl font-semibold">{name}</p>
        <p className="mt-1 font-mono text-sm text-primary-100">{memberCode(member)} / {member.studentId}</p>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-primary-200">Tier</dt>
          <dd className="font-medium">{member.tier?.name ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-primary-200">{active ? 'Expires' : 'Expired'}</dt>
          <dd className="font-medium">{formatDate(member.expiresAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-primary-200">Days left</dt>
          <dd className={`font-semibold ${daysTone}`}>{days == null ? '-' : Math.max(days, 0)}</dd>
        </div>
      </dl>
      {onRenew && (
        <Button className="mt-5 !bg-white !text-primary-700 hover:!bg-primary-50" icon={LuRefreshCw} onClick={onRenew}>
          {active ? 'Renew membership' : 'Reactivate membership'}
        </Button>
      )}
    </div>
  );
}
