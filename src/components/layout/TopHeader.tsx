'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLibrary } from '@/context/LibraryContext';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  RefreshCw,
  Download,
  Menu,
} from 'lucide-react';
import Image from 'next/image';

interface TopHeaderProps {
  onOpenAuthModal: () => void;
}

export function TopHeader({ onOpenAuthModal }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useLibrary();
  const [showDropdown, setShowDropdown] = useState(false);

  const canGoBack = () => {
    if (typeof window !== 'undefined') window.history.back();
  };

  const canGoForward = () => {
    if (typeof window !== 'undefined') window.history.forward();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-[#121212]/80 backdrop-blur-md transition-colors border-b border-white/5">
      {/* Left: Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={canGoBack}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors shadow"
          title="Quay lại"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={canGoForward}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors shadow"
          title="Tiến lên"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {pathname.startsWith('/playlist') && (
          <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-zinc-400">
            Chi tiết Playlist
          </span>
        )}
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        {/* User Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 pr-3 bg-black/60 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-colors"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-zinc-700">
              <Image src={currentUser.avatar} alt="Avatar" fill className="object-cover" />
            </div>
            <span className="text-xs font-bold text-white max-w-[100px] truncate">
              {currentUser.name}
            </span>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 top-10 w-52 bg-[#282828] border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs text-white"
              onClick={() => setShowDropdown(false)}
            >
              <div className="px-3 py-2 border-b border-zinc-700">
                <p className="font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
              </div>

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
          )}
        </div>
      </div>
    </header>
  );
}
