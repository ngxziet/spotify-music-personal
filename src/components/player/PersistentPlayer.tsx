'use client';

import React, { useState } from 'react';
import { useAudio, useAudioPosition } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { usePwa } from '@/context/PwaContext';
import { formatTime } from '@/utils/format';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Download,
  Mic2,
  ListMusic,
  Maximize2,
  Check,
  Disc,
} from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';

interface PersistentPlayerProps {
  onOpenSleepTimer?: () => void;
}

export function PersistentPlayer({ onOpenSleepTimer }: PersistentPlayerProps) {
  const {
    currentSong,
    isPlaying,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    playbackRate,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    setPlaybackRate,
    isLyricsOpen,
    setIsLyricsOpen,
    isQueueOpen,
    setIsQueueOpen,
    setIsNowPlayingOpen,
  } = useAudio();
  const currentTime = useAudioPosition();

  const { isSongLiked, isSongOffline, toggleLikeSong, downloadSong } = useLibrary();
  const { showToast } = usePwa();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!currentSong) return null;

  const isLiked = isSongLiked(currentSong.id);
  const isOfflineReady = isSongOffline(currentSong.id) || !!currentSong.isLocal || !!currentSong.isDownloaded;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = (volume || 0) * 100;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    const ok = await downloadSong(currentSong, true);
    setIsDownloading(false);
    if (ok) {
      setDownloadSuccess(true);
      showToast(`Đã lưu "${currentSong.title}" để nghe Offline!`, 'success');
      setTimeout(() => setDownloadSuccess(false), 2000);
    } else {
      showToast('Không thể tải bài hát này lúc này.', 'warning');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <>
      {/* MOBILE MINI PLAYER (fixed right above bottom navigation bar, respecting safe area) */}
      <div
        onClick={() => setIsNowPlayingOpen(true)}
        className="md:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-[max(0.5rem,env(safe-area-inset-left,0px))] right-[max(0.5rem,env(safe-area-inset-right,0px))] z-40 bg-[#282828]/95 backdrop-blur-md rounded-lg shadow-2xl p-2.5 flex items-center justify-between cursor-pointer border border-white/10 active:scale-[0.99] transition-transform"
      >
        {/* Top Progress Line */}
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1ed760] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
            <Image src={currentSong.coverUrl} alt="Cover" fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
            <p className="text-[11px] text-zinc-400 truncate">{currentSong.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleLikeSong(currentSong)}
            className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform"
            aria-label={isLiked ? 'Bỏ thích' : 'Yêu thích'}
          >
            <Heart
              className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760] text-[#1ed760]' : ''}`}
            />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-transform shadow-md"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* DESKTOP STICKY PLAYER */}
      <footer className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-[#181818]/95 backdrop-blur-md border-t border-zinc-800/80 px-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] items-center justify-between z-40 text-white select-none">
        {/* Left: Song Info & Quick Actions */}
        <div className="flex items-center gap-3 w-[28%] min-w-[150px] max-w-[280px]">
          <div
            onClick={() => setIsNowPlayingOpen(true)}
            className="relative w-14 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0 cursor-pointer shadow group"
            title="Mở toàn màn hình"
          >
            <Image src={currentSong.coverUrl} alt="Cover" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p
              onClick={() => setIsNowPlayingOpen(true)}
              className="text-sm font-semibold text-white truncate hover:underline cursor-pointer"
            >
              {currentSong.title}
            </p>
            <p className="text-xs text-zinc-400 truncate hover:underline cursor-pointer">
              {currentSong.artist}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleLikeSong(currentSong)}
              className={`p-2 rounded-full hover:scale-110 transition-transform ${
                isLiked ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
              }`}
              title={isLiked ? 'Bỏ thích' : 'Yêu thích'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
            </button>

            {!currentSong.isLive && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={`p-2 rounded-full hover:scale-110 transition-transform ${
                  downloadSuccess || isOfflineReady ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
                }`}
                title={isOfflineReady ? 'Đã lưu Offline (Nhấn để tải .mp3)' : 'Tải MP3 về máy & lưu Offline'}
              >
                {downloadSuccess || isOfflineReady ? (
                  <Check className="w-4 h-4 text-[#1ed760]" />
                ) : (
                  <Download
                    className={`w-4 h-4 ${
                      isDownloading ? 'animate-bounce text-[#1ed760]' : ''
                    }`}
                  />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Center: Playback Controls & Progress Bar */}
        <div className="flex-1 max-w-[480px] flex flex-col items-center px-2">
          {/* Controls Buttons */}
          <div className="flex items-center gap-3 sm:gap-5 mb-1.5">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 transition-colors ${
                isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Trộn bài"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={playPrevious}
              className="p-1.5 text-zinc-400 hover:text-white transition-transform active:scale-95"
              title="Bài trước"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-1.5 text-zinc-400 hover:text-white transition-transform active:scale-95"
              title="Bài kế tiếp"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`relative p-1.5 transition-colors ${
                repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Lặp lại: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute top-0 right-0 text-[8px] font-bold">1</span>
              )}
            </button>
          </div>

          {/* Seek Bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-mono w-9 text-right">
              {formatTime(currentTime)}
            </span>

            <div className="flex-1 relative group flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentSong.isLive ? 0 : currentTime}
                disabled={Boolean(currentSong.isLive)}
                onChange={handleSeek}
                className="w-full h-1 bg-zinc-700 rounded-lg cursor-pointer accent-[#1ed760] disabled:cursor-default"
                style={{
                  background: `linear-gradient(to right, #1ed760 ${progressPercent}%, #4d4d4d ${progressPercent}%)`,
                }}
              />
            </div>

            <span className="text-[11px] text-zinc-400 font-mono w-9">
              {currentSong.isLive ? 'LIVE' : formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Secondary Actions (Lyrics, Queue, Volume, Fullscreen) */}
        <div className="flex items-center justify-end gap-1.5 lg:gap-2.5 w-[28%] min-w-[120px]">
          <button
            onClick={() => setIsLyricsOpen(!isLyricsOpen)}
            className={`p-1.5 transition-colors ${
              isLyricsOpen ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
            title="Lời bài hát"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`p-1.5 transition-colors ${
              isQueueOpen ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
            title="Hàng đợi"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Speed selector */}
          <button
            onClick={() => {
              const speeds = [1, 1.25, 1.5, 0.8];
              const idx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
              setPlaybackRate(speeds[idx]);
            }}
            className="hidden lg:block text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Tốc độ phát"
          >
            {playbackRate}x
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              title={isMuted ? 'Bật âm' : 'Tắt âm'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <div className="hidden lg:block w-20 xl:w-28">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-zinc-700 rounded-lg cursor-pointer accent-[#1ed760]"
                style={{
                  background: `linear-gradient(to right, #1ed760 ${volumePercent}%, #4d4d4d ${volumePercent}%)`,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => setIsNowPlayingOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            title="Mở toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
}
