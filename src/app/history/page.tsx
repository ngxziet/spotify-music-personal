'use client';

import React, { useState, useMemo } from 'react';
import { useAudio } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { SongRow } from '@/components/cards/SongRow';
import { formatTime, formatRelativeTime } from '@/utils/format';
import {
  History,
  Play,
  Pause,
  Shuffle,
  Trash2,
  Search,
  Clock,
  Sparkles,
  Music,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const {
    history,
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    isShuffle,
    toggleShuffle,
    clearHistory,
    removeFromHistory,
  } = useAudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  const totalDuration = useMemo(() => {
    return history.reduce((acc, song) => acc + (song.duration || 0), 0);
  }, [history]);

  const isHistoryPlaying =
    history.some((s) => s.id === currentSong?.id) && isPlaying;

  const handlePlayAll = () => {
    if (isHistoryPlaying) {
      togglePlay();
    } else if (filteredHistory.length > 0) {
      playSong(filteredHistory[0], filteredHistory);
    }
  };

  const handleConfirmClear = () => {
    clearHistory();
    setShowConfirmClear(false);
  };

  return (
    <div className="relative min-h-full">
      {/* Top Cyan/Slate Gradient Header */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-cyan-900 via-slate-900 to-[#121212] flex flex-col md:flex-row items-start md:items-end gap-6 shadow-xl border-b border-white/5">
        {/* Large History Icon Card */}
        <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-xl bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/10 group">
          <History className="w-20 h-20 md:w-24 md:h-24 text-white drop-shadow-md transition-transform group-hover:scale-110 duration-300" />
          <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header Details */}
        <div className="flex-1 space-y-2 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-300">
              NHẬT KÝ PHÁT
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
              Tự động lưu
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight">
            Lịch Sử Nghe Nhạc
          </h1>

          <p className="text-xs md:text-sm text-zinc-300 line-clamp-1 pt-1">
            Danh sách các bài hát bạn đã thưởng thức gần đây trên SoundWave
          </p>

          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium pt-2">
            <span className="font-bold text-white">Bộ nhớ thiết bị</span>
            <span>•</span>
            <span>{history.length} bài hát</span>
            {totalDuration > 0 && (
              <>
                <span>•</span>
                <span className="text-zinc-400">Khoảng {formatTime(totalDuration)} nghe nhạc</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60 bg-[#121212]/50 backdrop-blur-sm sticky top-[60px] z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayAll}
            disabled={filteredHistory.length === 0}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
            title={isHistoryPlaying ? 'Tạm dừng' : 'Phát lại toàn bộ lịch sử'}
          >
            {isHistoryPlaying ? (
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
            title="Trộn bài ngẫu nhiên"
          >
            <Shuffle className="w-6 h-6" />
          </button>

          {history.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
              title="Xóa toàn bộ lịch sử nghe"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Lịch Sử</span>
            </button>
          )}
        </div>

        {/* Search input in history */}
        {history.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm trong lịch sử..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-[#1ed760] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#242424] border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-full bg-red-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Xóa lịch sử phát?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Hành động này sẽ xóa toàn bộ {history.length} bài hát trong lịch sử nghe nhạc của bạn khỏi bộ nhớ thiết bị.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Songs Table List */}
      <div className="px-4 md:px-8 py-4 pb-16">
        {history.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center mx-auto text-zinc-500">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Chưa có bài hát nào trong lịch sử</h2>
              <p className="text-xs text-zinc-400">
                Bất kỳ bản nhạc nào bạn phát trên SoundWave sẽ được tự động ghi nhận lại tại đây.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <span>Tìm kiếm & Khám phá bài hát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            Không tìm thấy bài hát nào khớp với từ khóa "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-6 text-center">#</span>
                <span>Tiêu Đề</span>
              </div>
              <div className="flex-1 px-4">Album</div>
              <div className="w-36 text-center">Thời Gian Nghe</div>
              <div className="flex items-center gap-3 flex-shrink-0 justify-end w-28">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Song rows */}
            {filteredHistory.map((song, idx) => (
              <div key={`${song.id}-${song.playedAt || idx}`} className="relative group">
                <SongRow
                  song={song}
                  index={idx}
                  playlistContext={filteredHistory}
                  onRemove={() => removeFromHistory(song.id)}
                />
                {song.playedAt && (
                  <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 pointer-events-none group-hover:text-zinc-300">
                    {formatRelativeTime(song.playedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
