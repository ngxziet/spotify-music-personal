'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLibrary } from '@/context/LibraryContext';
import { usePwa } from '@/context/PwaContext';
import {
  ChevronLeft,
  ChevronRight,
  User,
  RefreshCw,
  Download,
  History,
  Music,
  Smartphone,
  Upload,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface TopHeaderProps {
  onOpenAuthModal: () => void;
  onOpenUploadSong: () => void;
}

export function TopHeader({ onOpenAuthModal, onOpenUploadSong }: TopHeaderProps) {
  const pathname = usePathname();
  const { currentUser } = useLibrary();
  const { isStandalone, isOnline, promptInstall } = usePwa();
  const [showDropdown, setShowDropdown] = useState(false);

  const canGoBack = () => {
    if (typeof window !== 'undefined') window.history.back();
  };

  const canGoForward = () => {
    if (typeof window !== 'undefined') window.history.forward();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 pt-[max(0.6rem,env(safe-area-inset-top,0px))] bg-[#121212]/90 backdrop-blur-md transition-colors border-b border-white/5">
      {/* Left: Navigation Controls & Mobile Brand */}
      <div className="flex items-center gap-2">
        {/* Mobile Brand Logo */}
        <Link href="/" className="md:hidden flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-full bg-[#1ed760] flex items-center justify-center text-black font-bold shadow-sm">
            <Music className="w-4 h-4 fill-black stroke-black" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">
            SoundWave
          </span>
        </Link>

        <button
          onClick={canGoBack}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center transition-all shadow"
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={canGoForward}
          className="hidden xs:flex w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white items-center justify-center transition-all shadow"
          title="Tiến lên"
          aria-label="Tiến lên"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {pathname.startsWith('/playlist') && (
          <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-zinc-400">
            Chi tiết Playlist
          </span>
        )}
      </div>

      {/* Right: Install App, Offline Indicator & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!isOnline && (
          <Link
            href="/offline"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-colors"
            title="Chế độ Ngoại tuyến"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Offline</span>
          </Link>
        )}

        {!isStandalone && (
          <button
            onClick={() => promptInstall()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black hover:bg-[#1ed760] text-xs font-bold shadow transition-all active:scale-95"
            title="Tải & cài đặt SoundWave như ứng dụng"
            aria-label="Tải App SoundWave"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tải App</span>
          </button>
        )}

        {/* User Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 pr-2.5 sm:pr-3 bg-black/60 hover:bg-zinc-800 rounded-full border border-zinc-800 active:scale-95 transition-all"
            aria-label="Menu tài khoản"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
              <Image src={currentUser.avatar} alt="Avatar" fill className="object-cover" />
            </div>
            <span className="text-xs font-bold text-white max-w-[80px] sm:max-w-[120px] truncate">
              {currentUser.name}
            </span>
          </button>

          {showDropdown && (
            <>
              {/* Click outside backdrop for mobile and desktop */}
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setShowDropdown(false)}
              />
              <div
                className="absolute right-0 top-11 w-52 bg-[#282828] border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs text-white"
                onClick={() => setShowDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-zinc-700">
                  <p className="font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                </div>

                <Link
                  href="/history"
                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Lịch sử nghe nhạc</span>
                </Link>

                <button
                  onClick={onOpenUploadSong}
                  className="md:hidden w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#1ed760]" />
                  <span>Tải nhạc từ máy</span>
                </button>

                <button
                  onClick={onOpenAuthModal}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4 text-[#1ed760]" />
                  <span>Hồ sơ & Tài khoản</span>
                </button>

                <button
                  onClick={onOpenAuthModal}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>Chuyển đổi tài khoản</span>
                </button>

                <button
                  onClick={onOpenAuthModal}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors border-t border-zinc-700"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Sao lưu dữ liệu cá nhân</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
