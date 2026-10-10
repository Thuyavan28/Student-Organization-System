import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { LuCameraOff } from 'react-icons/lu';

const REGION_ID = 'clubflow-qr-region';

export default function QrScanner({ onScan }) {
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID);
    const started = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => onScanRef.current(text),
        () => {},
      )
      .catch(() => {
        setError('Camera is not available. Allow camera access or enter the ticket code below.');
      });

    return () => {
      // stop() rejects when start() never succeeded, which is expected when permission was denied.
      started
        .then(() => scanner.stop())
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900">
      <div id={REGION_ID} className="min-h-[18rem] w-full" />
      {error && (
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <LuCameraOff className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
