import React, { useState } from 'react';
import { Download, Wifi, WifiOff, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'dark' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          variant === 'dark'
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            variant === 'dark'
              ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900">Install on iPhone or iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Tap the <strong>Share</strong> icon in your Safari toolbar.</li>
                <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>3. Open Smart Class Assistant from your home screen for offline course access.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const ConnectivityStatusBadge: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
        isOnline
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}
      title={
        isOnline
          ? 'Connected to live academic database'
          : 'Offline mode: previously downloaded materials remain accessible'
      }
    >
      {isOnline ? (
        <Wifi className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
      )}
      <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
    </div>
  );
};

export const OfflineBanner: React.FC<{ cachedCount: number; onOpenOfflineLibrary?: () => void }> = ({
  cachedCount,
  onOpenOfflineLibrary,
}) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            <strong>Offline Mode Active:</strong> You have {cachedCount} downloaded resource{cachedCount === 1 ? '' : 's'} available offline. Live submissions, quizzes, Q&amp;A replies, and new uploads require an internet connection.
          </span>
        </div>
        {onOpenOfflineLibrary && (
          <button
            type="button"
            onClick={onOpenOfflineLibrary}
            className="rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Open Offline Library
          </button>
        )}
      </div>
    </div>
  );
};
