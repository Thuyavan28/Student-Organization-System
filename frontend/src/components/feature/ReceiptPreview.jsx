import { useState } from 'react';
import { LuFileText } from 'react-icons/lu';
import { API_ORIGIN } from '../../api/axiosInstance';
import Modal from '../ui/Modal';

export function receiptSrc(receiptUrl) {
  if (/^https?:\/\//.test(receiptUrl)) return receiptUrl;
  return `${API_ORIGIN}/${receiptUrl.replace(/^\//, '')}`;
}

export default function ReceiptPreview({ receiptUrl, onClose }) {
  const [failed, setFailed] = useState(false);
  const src = receiptUrl ? receiptSrc(receiptUrl) : null;
  const isPdf = src?.toLowerCase().endsWith('.pdf');

  return (
    <Modal open={Boolean(receiptUrl)} title="Receipt" onClose={onClose} size="lg">
      {failed ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
          <LuFileText className="h-8 w-8" aria-hidden="true" />
          <p className="text-sm">This receipt file is not available. Demo records may reference files that were never uploaded.</p>
        </div>
      ) : isPdf ? (
        <iframe title="Receipt PDF" src={src} className="h-[65vh] w-full rounded-lg border border-slate-200" onError={() => setFailed(true)} />
      ) : (
        <img src={src} alt="Uploaded receipt" className="mx-auto max-h-[65vh] rounded-lg" onError={() => setFailed(true)} />
      )}
      {src && !failed && (
        <a className="mt-3 inline-block text-sm text-primary-700 hover:underline" href={src} target="_blank" rel="noreferrer">
          Open in a new tab
        </a>
      )}
    </Modal>
  );
}
