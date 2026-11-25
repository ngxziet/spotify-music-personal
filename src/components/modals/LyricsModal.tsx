'use client';

import React from 'react';
import { useAudio } from '@/context/AudioContext';
import { X, Mic2, Disc } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';

export function LyricsModal() {
  const { currentSong, isLyricsOpen, setIsLyricsOpen, currentTime } = useAudio();

  if (!isLyricsOpen) return null;

  const defaultLyrics = currentSong?.lyrics || `[00:00.00] ♫ Giai điệu đang vang lên...
[00:10.00] Lắng nghe từng nhịp đập của âm thanh
[00:20.00] Hòa mình vào không gian âm nhạc thư thái
[00:30.00] Cùng SoundWave tận hưởng phút giây này!
[00:45.00] (Không có lời bài hát chi tiết cho track này)
[01:00.00] ♫ Tận hưởng giai điệu tuyệt vời ♫`;

  // Parse lyrics lines
  const lines = defaultLyrics.split('\n').map((line, idx) => {
    const timeMatch = line.match(/\[(\d+):(\d+\.?\d*)\]/);
    let seconds = 0;
    let text = line;
    if (timeMatch) {
      seconds = parseInt(timeMatch[1]) * 60 + parseFloat(timeMatch[2]);
      text = line.replace(/\[\d+:\d+\.?\d*\]/, '').trim();
    }
    return { id: idx, seconds, text };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col bg-gradient-to-b from-[#183424] to-[#121212] text-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-900/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-zinc-800 shadow-md flex-shrink-0">
              {currentSong?.coverUrl ? (
                <Image src={currentSong.coverUrl} alt="Cover" fill className="object-cover" />
              ) : (
                <Disc className="w-full h-full p-2 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">{currentSong?.title || 'Chưa chọn bài hát'}</h3>
              <p className="text-xs text-zinc-300 truncate">{currentSong?.artist || 'SoundWave Player'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className="hidden xs:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-medium">
              <Mic2 className="w-3.5 h-3.5" />
              Lyrics
            </span>
            <button
              onClick={() => setIsLyricsOpen(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 text-center">
          {lines.map((item) => {
            const isHighlight =
              currentTime >= item.seconds &&
              (lines[item.id + 1] ? currentTime < lines[item.id + 1].seconds : true);

            return (
              <p
                key={item.id}
                className={`text-base sm:text-xl md:text-2xl font-bold transition-all duration-300 ${
                  isHighlight
                    ? 'text-white scale-105 drop-shadow-[0_0_12px_rgba(30,215,96,0.6)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {item.text || '...'}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
