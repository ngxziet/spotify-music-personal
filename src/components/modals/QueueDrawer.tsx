'use client';

import React, { useState } from 'react';
import { useAudio } from '@/context/AudioContext';
import { X, ListMusic, Trash2, Play, Disc, History, Clock } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';
import { formatRelativeTime } from '@/utils/format';

export function QueueDrawer() {
  const {
    currentSong,
    queue,
    history,
    isQueueOpen,
    setIsQueueOpen,
    removeFromQueue,
    clearQueue,
    clearHistory,
    removeFromHistory,
    playSong,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[#181818] border-l border-zinc-800 flex flex-col text-white shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          {/* Segmented Tab Controls */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4 text-[#1ed760]" />
              <span>Hàng Đợi ({queue.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Lịch Sử ({history.length})</span>
            </button>
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
          {activeTab === 'queue' ? (
            <>
              {/* Now Playing */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Đang Phát Hiện Tại
                </h3>
                {currentSong ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
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

              {/* Next Up in Queue */}
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
            </>
          ) : (
            /* History Tab */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  Đã Nghe Gần Đây ({history.length})
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa lịch sử
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Chưa có bài hát nào trong lịch sử phát.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((song, idx) => (
                    <div
                      key={`${song.id}-${song.playedAt || idx}`}
                      className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => playSong(song)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-zinc-500 w-4 text-center">{idx + 1}</span>
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                          <Image src={song.coverUrl} alt="Cover" fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-white truncate group-hover:text-[#1ed760] transition-colors">
                            {song.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="truncate">{song.artist}</span>
                            {song.playedAt && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-500 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatRelativeTime(song.playedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => playSong(song)}
                          className="p-1.5 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Phát lại"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => removeFromHistory(song.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa khỏi lịch sử"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
