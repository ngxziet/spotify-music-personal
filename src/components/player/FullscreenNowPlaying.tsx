'use client';

import React, { useState } from 'react';
import { useAudio } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { formatTime } from '@/utils/format';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Download,
  Mic2,
  ListMusic,
  Clock,
  Check,
  Disc,
} from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';

interface FullscreenNowPlayingProps {
  onOpenSleepTimer: () => void;
}

export function FullscreenNowPlaying({ onOpenSleepTimer }: FullscreenNowPlayingProps) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    playbackRate,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    setPlaybackRate,
    setIsLyricsOpen,
    setIsQueueOpen,
  } = useAudio();

  const { isSongLiked, toggleLikeSong, downloadSong } = useLibrary();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isNowPlayingOpen || !currentSong) return null;

  const isLiked = isSongLiked(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = async () => {
    setIsDownloading(true);
    const ok = await downloadSong(currentSong, true);
    setIsDownloading(false);
    if (ok) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const speedOptions = [1, 1.25, 1.5, 0.8];
  const nextSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackRate);
    const nextIdx = (currentIndex + 1) % speedOptions.length;
    setPlaybackRate(speedOptions[nextIdx]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-gradient-to-b from-zinc-900 via-[#121212] to-black text-white animate-in slide-in-from-bottom duration-300 overflow-y-auto">
      {/* Background ambient blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <Image
          src={currentSong.coverUrl}
          alt="Ambient Background"
          fill
          className="object-cover blur-3xl scale-125"
        />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Thu nhỏ trình phát"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Đang Phát Bài Hát
          </p>
          <p className="text-xs font-semibold text-zinc-200 truncate max-w-[200px]">
            {currentSong.album || 'SoundWave Music'}
          </p>
        </div>

        <button
          onClick={onOpenSleepTimer}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Hẹn giờ tắt"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>

      {/* Main Cover Artwork */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6">
        <div className="relative aspect-square w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 group">
          <Image
            src={currentSong.coverUrl}
            alt={currentSong.title}
            fill
            className="object-cover"
            priority
          />
          {isPlaying && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-ping"></span>
              <span className="text-[10px] font-bold text-[#1ed760] uppercase">Playing</span>
            </div>
          )}
        </div>
      </div>

      {/* Song Info & Actions */}
      <div className="relative z-10 max-w-md mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-xl md:text-2xl font-bold truncate text-white">
              {currentSong.title}
            </h2>
            <p className="text-sm md:text-base text-zinc-400 truncate">
              {currentSong.artist}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLikeSong(currentSong)}
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors"
              title={isLiked ? 'Bỏ thích' : 'Yêu thích'}
            >
              <Heart
                className={`w-6 h-6 ${
                  isLiked ? 'fill-[#1ed760] text-[#1ed760]' : ''
                }`}
              />
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors"
              title="Tải MP3 về máy"
            >
              {downloadSuccess ? (
                <Check className="w-6 h-6 text-[#1ed760]" />
              ) : (
                <Download
                  className={`w-6 h-6 ${
                    isDownloading ? 'animate-bounce text-[#1ed760]' : ''
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="relative group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-zinc-700/60 rounded-lg cursor-pointer accent-[#1ed760]"
              style={{
                background: `linear-gradient(to right, #1ed760 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between py-2">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
            title="Trộn bài"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous */}
          <button
            onClick={playPrevious}
            className="p-2 text-zinc-300 hover:text-white transition-transform active:scale-90"
            title="Bài trước"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play / Pause Circular */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black" />
            ) : (
              <Play className="w-8 h-8 fill-black ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="p-2 text-zinc-300 hover:text-white transition-transform active:scale-90"
            title="Bài kế tiếp"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeatMode}
            className={`relative p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Lặp lại: ${repeatMode}`}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === 'one' && (
              <span className="absolute top-1 right-1 text-[9px] font-bold">1</span>
            )}
          </button>
        </div>

        {/* Bottom Quick Tools */}
        <div className="flex items-center justify-around pt-3 border-t border-white/10 text-xs text-zinc-400">
          <button
            onClick={() => {
              setIsNowPlayingOpen(false);
              setIsLyricsOpen(true);
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Mic2 className="w-4 h-4 text-[#1ed760]" />
            Lời bài hát
          </button>

          <button
            onClick={nextSpeed}
            className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px]"
            title="Tốc độ phát"
          >
            {playbackRate}x
          </button>

          <button
            onClick={() => {
              setIsNowPlayingOpen(false);
              setIsQueueOpen(true);
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <ListMusic className="w-4 h-4 text-[#1ed760]" />
            Hàng đợi
          </button>
        </div>
      </div>
    </div>
  );
}
