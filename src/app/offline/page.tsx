'use client';

import React from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { SongRow } from '@/components/cards/SongRow';
import { formatTime } from '@/utils/format';
import { DownloadCloud, Play, Pause, Shuffle, WifiOff, Clock } from 'lucide-react';
import Link from 'next/link';

export default function OfflineSongsPage() {
  const { offlineSongs, deleteOfflineSong } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlay, isShuffle, toggleShuffle } = useAudio();

  const isOfflinePlaying =
    offlineSongs.some((s) => s.id === currentSong?.id) && isPlaying;

  const totalDuration = offlineSongs.reduce((acc, song) => acc + (song.duration || 0), 0);

  const handlePlayAll = () => {
    if (isOfflinePlaying) {
      togglePlay();
    } else if (offlineSongs.length > 0) {
      playSong(offlineSongs[0], offlineSongs);
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Header Banner */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-teal-800 via-emerald-950 to-[#121212] flex flex-col md:flex-row items-start md:items-end gap-6 shadow-xl">
        <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/10">
          <DownloadCloud className="w-24 h-24 text-white drop-shadow-lg" />
        </div>

        <div className="flex-1 space-y-2 text-white">
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300 flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            CHẾ ĐỘ NGOẠI TUYẾN (OFFLINE CACHE)
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight">
            Nhạc Đã Tải Về
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 pt-1">
            Các bài hát đã được lưu trực tiếp vào bộ nhớ trình duyệt (IndexedDB). Bạn có thể nghe bất cứ lúc nào ngay cả khi không có kết nối mạng Internet.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium pt-2">
            <span className="font-bold text-white">Thư viện Offline</span>
            <span>•</span>
            <span>{offlineSongs.length} bài hát</span>
            <span>•</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-5 flex items-center gap-4">
        <button
          onClick={handlePlayAll}
          disabled={offlineSongs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
