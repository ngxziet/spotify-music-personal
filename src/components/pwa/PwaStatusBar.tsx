'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePwa } from '@/context/PwaContext';
import {
  WifiOff,
  Download,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export function PwaStatusBar() {
  const {
    isOnline,
    isStandalone,
    canPromptInstall,
    promptInstall,
    isBannerDismissed,
    dismissBanner,
    updateAvailable,
    applyUpdate,
    toast,
  } = usePwa();

  return (
    <>
      {/* Offline Mode Bar */}
      {!isOnline && (
        <div
          role="status"
          className="px-3 sm:px-5 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 flex-wrap"
        >
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">
              Đang ngoại tuyến — Chỉ phát được nhạc đã tải về &amp; file MP3 cá nhân.
            </span>
          </div>
          <Link
            href="/offline"
            className="px-2.5 py-1 rounded-full bg-amber-400 text-black font-bold text-[11px] hover:bg-amber-300 transition-colors flex-shrink-0"
          >
            Mở Nhạc Offline
          </Link>
        </div>
      )}

      {/* New App Version Available Bar */}
      {updateAvailable && (
        <div className="px-3 sm:px-5 py-2 bg-[#1ed760]/15 border-b border-[#1ed760]/30 text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#1ed760] flex-shrink-0" />
            <span>Đã có bản cập nhật mới cho ứng dụng SoundWave.</span>
          </div>
          <button
            onClick={applyUpdate}
            className="px-3 py-1 rounded-full bg-[#1ed760] text-black font-bold text-[11px] hover:bg-[#1fdf64] transition-colors flex-shrink-0"
          >
            Cập nhật ngay
          </button>
        </div>
      )}

      {/* Subtle Install App Banner (only when not installed & not dismissed) */}
      {!isStandalone && !isBannerDismissed && isOnline && (
        <div className="mx-3 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-zinc-900 border border-[#1ed760]/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/icons/icon-192x192.png"
              alt="SoundWave"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg flex-shrink-0 border border-white/10"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                Cài đặt App SoundWave về máy
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {canPromptInstall
                  ? 'Nhấn để tải về màn hình chính & nghe nhạc offline'
                  : 'Mở như ứng dụng độc lập, hỗ trợ nghe offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => promptInstall()}
              className="px-3 py-1.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải App</span>
            </button>
            <button
              onClick={dismissBanner}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Ẩn gợi ý"
              aria-label="Ẩn gợi ý cài app"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed top-14 sm:top-16 right-3 sm:right-6 z-50 max-w-xs sm:max-w-sm animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <div
            className={`px-3.5 py-2.5 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-2.5 text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-[#1ed760]/40 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-100'
                : 'bg-zinc-900/95 border-zinc-700 text-zinc-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#1ed760] flex-shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
