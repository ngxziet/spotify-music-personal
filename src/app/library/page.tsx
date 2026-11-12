'use client';

import React, { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { SongRow } from '@/components/cards/SongRow';
import {
  Library,
  PlusSquare,
  Upload,
  Heart,
  DownloadCloud,
  ListMusic,
  Music,
} from 'lucide-react';
import Link from 'next/link';

export default function LibraryPage() {
  const { playlists, offlineSongs, uploadedSongs, likedSongIds } = useLibrary();
  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'offline' | 'uploaded'>('all');

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#1ed760]/20 text-[#1ed760]">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Thư Viện Của Bạn</h1>
            <p className="text-xs text-zinc-400">
              Quản lý các danh sách phát, bài hát đã tải về và file nhạc cá nhân
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/liked"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:scale-105 transition-transform"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Yêu Thích ({likedSongIds.length})</span>
          </Link>
          <Link
            href="/offline"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:scale-105 transition-transform"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Offline ({offlineSongs.length})</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-white text-black'
              : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Tất Cả
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'playlists'
              ? 'bg-white text-black'
              : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Playlists ({playlists.length})
        </button>
        <button
          onClick={() => setActiveTab('offline')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'offline'
              ? 'bg-white text-black'
              : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Đã Tải Về ({offlineSongs.length})
        </button>
        <button
          onClick={() => setActiveTab('uploaded')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'uploaded'
              ? 'bg-white text-black'
              : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Nhạc Tải Lên ({uploadedSongs.length})
        </button>
      </div>

      {/* TAB CONTENT: Playlists / All */}
      {(activeTab === 'all' || activeTab === 'playlists') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#1ed760]" />
            Danh Sách Phát
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </section>
      )}

      {/* TAB CONTENT: Offline Tracks */}
      {(activeTab === 'all' || activeTab === 'offline') && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-emerald-400" />
              Bài Hát Đã Lưu Offline ({offlineSongs.length})
            </h2>
            {offlineSongs.length > 0 && (
              <Link href="/offline" className="text-xs text-[#1ed760] hover:underline">
                Xem chi tiết
              </Link>
            )}
          </div>

          {offlineSongs.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800/60 text-zinc-400 text-xs">
              Chưa có bài hát nào được tải về để nghe offline. Hãy nhấn nút Download ở bất kỳ bài hát nào để lưu vào máy.
            </div>
          ) : (
            <div className="bg-black/20 rounded-xl p-2 md:p-3 border border-white/5 space-y-1">
              {offlineSongs.slice(0, 5).map((song, idx) => (
                <SongRow
                  key={`offline-${song.id}`}
                  song={song}
                  index={idx}
                  playlistContext={offlineSongs}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT: Uploaded Local Tracks */}
      {(activeTab === 'all' || activeTab === 'uploaded') && (
        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-400" />
            Nhạc Cá Nhân Tải Lên ({uploadedSongs.length})
          </h2>

          {uploadedSongs.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800/60 text-zinc-400 text-xs">
              Bạn chưa tải lên bài hát nào. Nhấn &quot;Tải MP3 Lên&quot; ở thanh điều hướng để thêm nhạc từ máy của bạn.
            </div>
          ) : (
            <div className="bg-black/20 rounded-xl p-2 md:p-3 border border-white/5 space-y-1">
              {uploadedSongs.map((song, idx) => (
                <SongRow
                  key={`uploaded-${song.id}`}
                  song={song}
                  index={idx}
                  playlistContext={uploadedSongs}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
