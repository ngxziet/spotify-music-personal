'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLibrary } from '@/context/LibraryContext';
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  DownloadCloud,
  Upload,
  Music,
  Trash2,
  History,
} from 'lucide-react';

interface SidebarProps {
  onOpenCreatePlaylist: () => void;
  onOpenUploadSong: () => void;
}

export function Sidebar({ onOpenCreatePlaylist, onOpenUploadSong }: SidebarProps) {
  const pathname = usePathname();
  const { playlists, deletePlaylist } = useLibrary();

  const navLinks = [
    { href: '/', label: 'Trang Chủ', icon: Home },
    { href: '/search', label: 'Tìm Kiếm', icon: Search },
    { href: '/library', label: 'Thư Viện', icon: Library },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-black h-full p-2 gap-2 text-zinc-300 select-none flex-shrink-0">
      {/* Top Box: Brand & Main Navigation */}
      <div className="bg-[#121212] rounded-lg p-5 flex flex-col gap-5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#1ed760] flex items-center justify-center text-black font-bold shadow-md">
            <Music className="w-5 h-5 fill-black stroke-black" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight group-hover:text-[#1ed760] transition-colors">
            SoundWave <span className="text-xs text-[#1ed760] font-normal">Music</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-3 font-semibold text-sm">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 py-1.5 transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-[#1ed760]' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Box: Playlists & Library Shortcuts */}
      <div className="bg-[#121212] rounded-lg p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 text-zinc-400 font-semibold text-sm">
          <Link
            href="/library"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <Library className="w-5 h-5" />
            <span>Thư Viện Của Bạn</span>
          </Link>
          <button
            onClick={onOpenCreatePlaylist}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title="Tạo playlist mới"
          >
            <PlusSquare className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="space-y-1.5 py-2 border-b border-zinc-800/80 mb-2">
          <button
            onClick={onOpenCreatePlaylist}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-white">
              <PlusSquare className="w-4 h-4" />
            </div>
            <span>Tạo Playlist Mới</span>
          </button>

          <Link
            href="/liked"
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs font-semibold transition-colors ${
              pathname === '/liked' ? 'bg-white/10 text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center text-white">
              <Heart className="w-3.5 h-3.5 fill-white" />
            </div>
            <span>Bài Hát Đã Thích</span>
          </Link>

          <Link
            href="/offline"
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs font-semibold transition-colors ${
              pathname === '/offline' ? 'bg-white/10 text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white">
              <DownloadCloud className="w-3.5 h-3.5" />
            </div>
            <span>Nhạc Đã Tải Về</span>
          </Link>

          <Link
            href="/history"
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs font-semibold transition-colors ${
              pathname === '/history' ? 'bg-white/10 text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-600 to-teal-500 flex items-center justify-center text-white">
              <History className="w-3.5 h-3.5" />
            </div>
            <span>Lịch Sử Nghe</span>
          </Link>

          <button
            onClick={onOpenUploadSong}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <span>Tải MP3 Lên</span>
          </button>
        </div>

        {/* Scrollable Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
          {playlists.map((pl) => {
            const isPlActive = pathname === `/playlist/${pl.id}`;
            return (
              <div
                key={pl.id}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md transition-colors ${
                  isPlActive ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Link
                  href={`/playlist/${pl.id}`}
                  className="flex-1 truncate pr-2"
                >
                  <p className="truncate">{pl.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {pl.isCustom ? 'Playlist của bạn' : 'Tuyển chọn'} • {pl.songs.length} bài
                  </p>
                </Link>

                {pl.isCustom && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Bạn có chắc muốn xóa playlist "${pl.title}"?`)) {
                        deletePlaylist(pl.id);
                      }
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                    title="Xóa playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
