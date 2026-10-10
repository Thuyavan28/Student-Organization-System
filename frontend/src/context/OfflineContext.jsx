import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LuWifiOff, LuWifi, LuRefreshCw } from 'react-icons/lu';
import Button from '../components/ui/Button';

const OfflineContext = createContext({ isOnline: true, checkConnection: () => {} });

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [wasOffline, setWasOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      // Ping lightweight health check or root
      const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      setIsOnline(res.ok || res.status < 500);
      if (res.ok) setWasOffline(false);
    } catch {
      // Fallback check
      setIsOnline(navigator.onLine);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show brief back online notification
        const timer = setTimeout(() => setWasOffline(false), 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <OfflineContext.Provider value={{ isOnline, checkConnection }}>
      {children}
      {/* Offline Alert Bar */}
      {!isOnline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between gap-3 bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md animate-slide-in"
        >
          <div className="flex items-center gap-2">
            <LuWifiOff className="h-4 w-4 animate-pulse" />
            <span>You&apos;re currently offline. Showing cached information. Check your internet connection.</span>
          </div>
          <button
            type="button"
            onClick={checkConnection}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700/80 px-2.5 py-1 text-xs hover:bg-amber-800 transition-colors disabled:opacity-50"
          >
            <LuRefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Try again'}</span>
          </button>
        </aside>
      )}

      {/* Back Online Toast */}
      {isOnline && wasOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all animate-slide-in"
        >
          <LuWifi className="h-4 w-4" />
          <span>You&apos;re back online. Synchronizing data...</span>
        </aside>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineScreen({ onRetry }) {
  const { checkConnection } = useOffline();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await checkConnection();
    if (onRetry) await onRetry();
    setRetrying(false);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
        <LuWifiOff className="h-8 w-8 animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">No Internet Connection</h2>
      <p className="mt-2 max-w-sm text-xs text-slate-500 leading-relaxed">
        We couldn&apos;t connect to the server. Please check your Wi-Fi or mobile data network and try again.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleRetry} loading={retrying} icon={LuRefreshCw}>
          Try again
        </Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    </div>
  );
}
