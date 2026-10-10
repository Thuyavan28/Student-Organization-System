import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import Button from '../ui/Button';

// The QR encodes only the opaque ticket token; it carries no personal data.
export default function QrTicket({ token, fileName = 'clubflow-ticket', dimmed = false }) {
  const canvasRef = useRef(null);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${fileName}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`rounded-xl border border-slate-200 bg-white p-3 ${dimmed ? 'opacity-40' : ''}`}>
        <QRCodeCanvas ref={canvasRef} value={token} size={200} level="M" marginSize={1} />
      </div>
      <div className="no-print flex gap-2">
        <Button size="sm" variant="secondary" icon={FiDownload} onClick={download}>
          Download
        </Button>
        <Button size="sm" variant="secondary" icon={FiPrinter} onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
}
