'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { androidBridge } from '@/utils/androidPlayback';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface PwaContextType {
  isOnline: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canPromptInstall: boolean;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  updateAvailable: boolean;
  applyUpdate: () => void;
  toast: ToastItem | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

const BANNER_DISMISSED_KEY = 'soundwave_install_banner_dismissed';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ id: `${Date.now()}`, message, type });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 3600);
    },
    []
  );

  // Detect environment, online state, and standalone mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const ios =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const android = /Android/i.test(ua);

    const checkStandalone = () => {
      if (androidBridge()) return true;
      const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const wcoMatch = window.matchMedia('(display-mode: window-controls-overlay)').matches;
      const iosStandalone =
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      return standaloneMatch || wcoMatch || iosStandalone;
    };

    queueMicrotask(() => {
      setIsOnline(navigator.onLine);
      setIsIOS(ios);
      setIsAndroid(android);
      setIsStandalone(checkStandalone());
      try {
        setIsBannerDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === '1');
      } catch {
        setIsBannerDismissed(false);
      }
    });

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã kết nối lại Internet!', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mất kết nối mạng — Chuyển sang chế độ Ngoại tuyến', 'warning');
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setIsInstallModalOpen(false);
      showToast('Đã cài đặt ứng dụng SoundWave thành công!', 'success');
    };

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => setIsStandalone(checkStandalone());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mql.addEventListener?.('change', handleDisplayChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener?.('change', handleDisplayChange);
    };
  }, [showToast]);

  // Register Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      setIsInstallModalOpen(true);
      return 'unavailable' as const;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallModalOpen(false);
      }
      return outcome;
    } catch {
      setIsInstallModalOpen(true);
      return 'unavailable' as const;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {}
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isStandalone,
        isIOS,
        isAndroid,
        canPromptInstall: !!deferredPrompt,
        isInstallModalOpen,
        setIsInstallModalOpen,
        isBannerDismissed,
        dismissBanner,
        promptInstall,
        updateAvailable,
        applyUpdate,
        toast,
        showToast,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return ctx;
}
