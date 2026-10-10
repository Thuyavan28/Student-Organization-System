import { STATUS_TONE, TONES, humanize } from '../../utils/constants';

export default function Badge({ status, tone, children, className = '' }) {
  const resolvedTone = tone || STATUS_TONE[status] || 'gray';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[resolvedTone]} ${className}`}>
      {children ?? humanize(status)}
    </span>
  );
}
