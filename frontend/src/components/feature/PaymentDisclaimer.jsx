import { FiInfo } from 'react-icons/fi';
import { PAYMENT_DISCLAIMER } from '../../utils/constants';

export default function PaymentDisclaimer({ className = '' }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 ${className}`}
      role="note"
    >
      <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{PAYMENT_DISCLAIMER}</span>
    </div>
  );
}
