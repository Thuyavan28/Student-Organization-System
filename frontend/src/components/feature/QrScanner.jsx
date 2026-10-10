import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  LuCamera,
  LuCameraOff,
  LuUpload,
  LuImage,
  LuRefreshCw,
  LuSwitchCamera,
  LuScan,
  LuInfo,
  LuShieldAlert,
} from 'react-icons/lu';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useToast } from '../../context/ToastContext';

const REGION_ID = 'clubflow-qr-region';

export default function QrScanner({ onScan, sampleToken = null }) {
  const toast = useToast();
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'permission' | 'notfound' | 'insecure' | 'other'
  const [fileScanning, setFileScanning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const fileInputRef = useRef(null);
  onScanRef.current = onScan;

  const stopScannerInternal = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
    }
    setScanning(false);
  }, []);

  // Initialize and start scanner with multi-strategy fallback
  const startScanner = useCallback(async (cameraIdToUse) => {
    try {
      setLoading(true);
      setError('');
      setErrorType('');

      // Check secure context (Chrome allows localhost and 127.0.0.1)
      const isSecure =
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        setErrorType('insecure');
        setError('Camera requires HTTPS or localhost. Please access via localhost, or upload a ticket QR screenshot below.');
        setLoading(false);
        return;
      }

      await stopScannerInternal();

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(REGION_ID);
      }

      // Enumerate available cameras if not yet cached
      let availableCameras = cameras;
      if (!availableCameras.length) {
        try {
          const devs = await Html5Qrcode.getCameras();
          if (devs && devs.length) {
            availableCameras = devs;
            setCameras(devs);
          }
        } catch {
          // Camera permission might need to be explicitly requested
        }
      }

      // Build fallback strategy list
      const configsToTry = [];
      if (cameraIdToUse) {
        configsToTry.push(cameraIdToUse);
      } else if (availableCameras.length > 0) {
        // On mobile, prefer rear/environment camera; on PC, use first available (webcam)
        const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
        const rear = availableCameras.find((c) => /back|rear|environment/i.test(c.label));
        const preferred = isMobile && rear ? rear : availableCameras[0];
        configsToTry.push(preferred.id);
        setSelectedCameraId(preferred.id);
      }

      // Add facingMode fallback configurations (without rigid aspectRatio constraints)
      const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
      if (isMobile) {
        configsToTry.push({ facingMode: { ideal: 'environment' } });
        configsToTry.push({ facingMode: 'user' });
      } else {
        configsToTry.push({ facingMode: 'user' });
        configsToTry.push({ facingMode: { ideal: 'environment' } });
      }

      let scanStarted = false;
      let lastError = null;

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: edge, height: edge };
        },
      };

      for (const config of configsToTry) {
        try {
          await scannerRef.current.start(
            config,
            scanConfig,
            (decodedText) => {
              if (onScanRef.current) {
                onScanRef.current(decodedText);
              }
            },
            () => {},
          );
          scanStarted = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (scanStarted) {
        setScanning(true);
        setError('');
        setErrorType('');

        // Ensure video element attributes for smooth browser rendering
        setTimeout(() => {
          const region = document.getElementById(REGION_ID);
          if (region) {
            const video = region.querySelector('video');
            if (video) {
              video.muted = true;
              video.setAttribute('playsinline', 'true');
              video.setAttribute('autoplay', 'true');
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.objectFit = 'cover';
              video.style.display = 'block';
              if (video.paused) {
                video.play().catch(() => {});
              }
            }
          }
        }, 120);
      } else {
        throw lastError || new Error('Could not start camera');
      }
    } catch (err) {
      setScanning(false);
      const msg = err?.message || String(err);
      if (/notallowed|permission|denied/i.test(msg)) {
        setErrorType('permission');
        setError('Camera permission was denied. Click the lock icon in your browser address bar to allow camera, or upload a QR image.');
      } else if (/notfound|overconstrained|device/i.test(msg)) {
        setErrorType('notfound');
        setError('No active camera detected. You can upload a QR image or enter the ticket code below.');
      } else {
        setErrorType('other');
        setError('Camera is not available. Allow camera access or enter the ticket code below.');
      }
    } finally {
      setLoading(false);
    }
  }, [cameras, stopScannerInternal]);

  // Request camera permission explicitly via browser mediaDevices
  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError('');
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices || []);
      if (devices?.length) {
        await startScanner(devices[0].id);
      } else {
        await startScanner();
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (/denied|notallowed/i.test(msg)) {
        setErrorType('permission');
        setError('Camera access is blocked in your browser. Check your site permissions in the address bar.');
      } else {
        setErrorType('notfound');
        setError('Camera not found. You can upload a QR image or enter the code manually.');
      }
      setLoading(false);
    }
  };

  // Switch camera if multiple exist
  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex].id;
      setSelectedCameraId(nextCam);
      startScanner(nextCam);
    }
  };

  // Handle QR image file upload or drop
  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileScanning(true);
    try {
      await stopScannerInternal();

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(REGION_ID);
      }

      const decodedText = await scannerRef.current.scanFile(file, false);
      if (decodedText && onScanRef.current) {
        toast.success('QR Code detected from image!');
        onScanRef.current(decodedText);
      }
    } catch {
      toast.error('Could not find a valid QR code in that image. Try another image or enter the ticket code.');
      setError('Could not find a valid QR code in that image. Please try another image or enter the code manually.');
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // ignore
        }
      }
    };
  }, [startScanner]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${
        isDragOver ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-800'
      } bg-slate-950 shadow-xl text-white transition-all`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Scanner Viewport */}
      <div className="relative min-h-[19rem] w-full flex items-center justify-center bg-black overflow-hidden">
        {/* The Html5Qrcode container is always in the DOM for proper video dimension calculations */}
        <div id={REGION_ID} className="w-full h-full min-h-[19rem]" />

        {/* Loading state overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-slate-300 z-20 backdrop-blur-sm">
            <Spinner className="h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-xs font-semibold tracking-wide">Connecting to camera feed...</p>
          </div>
        )}

        {/* Camera inactive fallback UI */}
        {!loading && !scanning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4 bg-slate-950/95">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 shadow-inner">
              {errorType === 'permission' ? (
                <LuShieldAlert className="h-7 w-7 text-rose-400" />
              ) : (
                <LuCameraOff className="h-7 w-7 text-amber-400" />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                {errorType === 'permission'
                  ? 'Camera Permission Needed'
                  : errorType === 'insecure'
                  ? 'HTTPS Required for Camera'
                  : 'Camera Scanner Ready'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-sm">
                {error || 'Allow camera access to scan ticket QR codes, or upload a ticket screenshot below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
              <Button
                size="sm"
                variant="secondary"
                onClick={requestCameraPermission}
                icon={LuCamera}
                className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800 shadow-sm"
              >
                Enable Camera
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                icon={LuUpload}
                loading={fileScanning}
                className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800 shadow-sm"
              >
                Upload QR Image
              </Button>

              {sampleToken && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    toast.info(`Testing sample ticket: ${sampleToken.slice(0, 8)}...`);
                    onScanRef.current && onScanRef.current(sampleToken);
                  }}
                  icon={LuScan}
                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                >
                  Test Sample Ticket
                </Button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Drag & drop a QR code image here or select one from your files
            </p>
          </div>
        )}

        {/* Live Scan Framing Overlay (Emerald HUD Reticle) */}
        {scanning && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className="relative h-48 w-48 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_30px_rgba(52,211,153,0.35)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Animated laser scanline */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e.target.files?.[0])}
        className="hidden"
        aria-label="Upload QR Image"
      />

      {/* Bottom Control Strip */}
      <div className="flex items-center justify-between border-t border-slate-800/90 bg-slate-900/95 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {scanning ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Camera Live
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1.5">
              <LuInfo className="h-3.5 w-3.5" />
              Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cameras.length > 1 && scanning && (
            <button
              type="button"
              onClick={switchCamera}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Switch Camera"
            >
              <LuSwitchCamera className="h-3.5 w-3.5" />
              <span>Flip</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Scan ticket image"
          >
            <LuImage className="h-3.5 w-3.5" />
            <span>Upload Image</span>
          </button>

          {scanning ? (
            <button
              type="button"
              onClick={stopScannerInternal}
              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startScanner()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-emerald-400 hover:bg-slate-800 transition-colors font-medium"
            >
              <LuRefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
