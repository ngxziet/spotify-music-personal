'use client';

import React, { useEffect, useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { usePwa } from '@/context/PwaContext';
import { SongRow } from '@/components/cards/SongRow';
import { formatTime } from '@/utils/format';
import { DownloadCloud, Play, Pause, Shuffle, WifiOff, Clock, Smartphone, HardDrive } from 'lucide-react';
import Link from 'next/link';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function OfflineSongsPage() {
  const { offlineSongs, deleteOfflineSong } = useLibrary();
  const { currentSong, isPlaying, playCollection, togglePlay, isShuffle, toggleShuffle } = useAudio();
  const { isStandalone, promptInstall } = usePwa();
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (est.usage !== undefined && est.quota !== undefined) {
            setStorageInfo({ usage: est.usage, quota: est.quota });
          }
        })
        .catch(() => {});
    }
  }, [offlineSongs.length]);

  const isOfflinePlaying =
    offlineSongs.some((s) => s.id === currentSong?.id) && isPlaying;

  const totalDuration = offlineSongs.reduce((acc, song) => acc + (song.duration || 0), 0);

  const handlePlayAll = () => {
    if (isOfflinePlaying) {
      togglePlay();
    } else if (offlineSongs.length > 0) {
      playCollection(offlineSongs);
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Header Banner */}
      <div className="relative p-4 sm:p-6 md:p-8 bg-gradient-to-b from-teal-800 via-emerald-950 to-[#121212] flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 shadow-xl text-center sm:text-left">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/10 mx-auto sm:mx-0">
          <DownloadCloud className="w-16 h-16 sm:w-24 sm:h-24 text-white drop-shadow-lg" />
        </div>

        <div className="flex-1 space-y-1.5 sm:space-y-2 text-white min-w-0 w-full">
          <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-emerald-300 flex items-center justify-center sm:justify-start gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            CHẾ ĐỘ NGOẠI TUYẾN (OFFLINE CACHE)
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
            Nhạc Đã Tải Về
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 pt-0.5 sm:pt-1">
            Các bài hát đã được lưu trực tiếp vào bộ nhớ trình duyệt (IndexedDB). Bạn có thể nghe bất cứ lúc nào ngay cả khi không có kết nối mạng Internet.
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-300 font-medium pt-1 sm:pt-2 flex-wrap">
            <span className="font-bold text-white">Thư viện Offline</span>
            <span>•</span>
            <span>{offlineSongs.length} bài hát</span>
            <span>•</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
            {storageInfo && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <HardDrive className="w-3.5 h-3.5" />
                  Đã dùng {formatBytes(storageInfo.usage)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 flex items-center gap-3 sm:gap-4">
        <button
          onClick={handlePlayAll}
          disabled={offlineSongs.length === 0}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          title={isOfflinePlaying ? 'Tạm dừng' : 'Phát tất cả'}
        >
          {isOfflinePlaying ? (
            <Pause className="w-6 h-6 fill-black" />
          ) : (
            <Play className="w-6 h-6 fill-black ml-0.5" />
          )}
        </button>

        <button
          onClick={toggleShuffle}
          className={`p-2 transition-colors ${
            isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
          }`}
          title="Trộn bài"
        >
          <Shuffle className="w-6 h-6" />
        </button>

        {!isStandalone && (
          <button
            onClick={() => promptInstall()}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-800 hover:bg-[#1ed760] text-white hover:text-black text-xs font-bold transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Tải App Về Máy</span>
          </button>
        )}
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-12">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          <div className="flex items-center gap-3">
            <span className="w-6 text-center">#</span>
            <span>Tiêu đề</span>
          </div>
          <div className="hidden md:block flex-1 px-4 truncate">Album</div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {offlineSongs.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-3">
            <WifiOff className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-base font-semibold text-white">Chưa có bài hát nào được tải về</p>
            <p className="text-xs text-zinc-500">
              Bấm biểu tượng Download ở bất kỳ bài hát nào để nghe offline không cần 3G/4G/Wifi.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition-transform"
            >
              Khám Phá Bài Hát
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {offlineSongs.map((song, idx) => (
              <SongRow
                key={`offline-${song.id}`}
                song={song}
                index={idx}
                playlistContext={offlineSongs}
                onRemove={() => deleteOfflineSong(song.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
