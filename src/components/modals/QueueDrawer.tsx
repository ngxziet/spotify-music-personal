'use client';

import React from 'react';
import { useAudio } from '@/context/AudioContext';
import { X, ListMusic, Trash2, Play, Disc } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';

export function QueueDrawer() {
  const { currentSong, queue, isQueueOpen, setIsQueueOpen, removeFromQueue, clearQueue, playSong } = useAudio();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[#181818] border-l border-zinc-800 flex flex-col text-white shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#1ed760]" />
            <h2 className="text-lg font-bold">Hàng Đợi Phát (Queue)</h2>
          </div>
          <button
            onClick={() => setIsQueueOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Now Playing */}
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Đang Phát Hiện Tại
            </h3>
            {currentSong ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-850 bg-white/5 border border-white/5">
                <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  <Image src={currentSong.coverUrl} alt="Cover" fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[#1ed760] truncate">{currentSong.title}</p>
                  <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Chưa có bài hát nào được chọn</p>
            )}
          </div>

          {/* Next Up */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Tiếp Theo ({queue.length})
              </h3>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa hết
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                <Disc className="w-8 h-8 mx-auto mb-2 opacity-30 animate-spin" />
                Hàng đợi đang trống. Chọn thêm bài hát để tiếp tục phát!
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs text-zinc-500 w-4 text-center">{idx + 1}</span>
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                        <Image src={song.coverUrl} alt="Cover" fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs text-white truncate">{song.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => playSong(song)}
                        className="p-1.5 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Phát ngay"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa khỏi hàng đợi"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
