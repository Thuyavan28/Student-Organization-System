import { STATUS_TONE, TONES, humanize } from '../../utils/constants';

export default function Badge({ status, tone, children, className = '' }) {
  const resolvedTone = tone || STATUS_TONE[status] || 'gray';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[resolvedTone]} ${className}`}
    >
      {children ?? humanize(status)}
    </span>
  );
}
