'use client';

import React, { use, useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { SongRow } from '@/components/cards/SongRow';
import { formatTime } from '@/utils/format';
import {
  Play,
  Pause,
  Shuffle,
  Download,
  Trash2,
  Clock,
  Music,
  Check,
  PlusCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const playlistId = resolvedParams.id;

  const { playlists, removeSongFromPlaylist, deletePlaylist, downloadSong } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlay, isShuffle, toggleShuffle } = useAudio();

  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllSuccess, setDownloadAllSuccess] = useState(false);

  const playlist = playlists.find((p) => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Không tìm thấy danh sách phát</h2>
        <p className="text-zinc-400 text-sm">Playlist này có thể đã bị xóa hoặc không tồn tại.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition-transform"
        >
          Trở về Trang Chủ
        </Link>
      </div>
    );
  }

  const isThisPlaylistPlaying =
    playlist.songs.some((s) => s.id === currentSong?.id) && isPlaying;

  const totalDuration = playlist.songs.reduce((acc, song) => acc + (song.duration || 0), 0);

  const handlePlayAll = () => {
    if (isThisPlaylistPlaying) {
      togglePlay();
    } else if (playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs);
    }
  };

  const handleDownloadAll = async () => {
    if (playlist.songs.length === 0) return;
    setIsDownloadingAll(true);
    for (const s of playlist.songs) {
      await downloadSong(s, false);
    }
    setIsDownloadingAll(false);
    setDownloadAllSuccess(true);
    setTimeout(() => setDownloadAllSuccess(false), 2500);
  };

  return (
    <div className="relative min-h-full">
      {/* Dynamic Gradient Top Header */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-emerald-800 via-emerald-950/80 to-[#121212] flex flex-col md:flex-row items-start md:items-end gap-6 shadow-lg">
        {/* Cover Art */}
        <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 shadow-2xl border border-white/10">
          <Image
            src={playlist.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'}
            alt={playlist.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2 text-white">
          <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-300">
            {playlist.isCustom ? 'Playlist Cá Nhân' : 'Tuyển Chọn Spotify'}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight line-clamp-2">
            {playlist.title}
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 pt-1">
            {playlist.description || 'Danh sách bài hát tuyển chọn'}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium pt-2">
            <span className="font-bold text-white">
              {playlist.isCustom ? 'Tạo bởi bạn' : 'Spotify Curated'}
            </span>
            <span>•</span>
            <span>{playlist.songs.length} bài hát</span>
            <span>•</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-5 flex items-center gap-4">
        {/* Play Button */}
        <button
          onClick={handlePlayAll}
          disabled={playlist.songs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          title={isThisPlaylistPlaying ? 'Tạm dừng' : 'Phát tất cả'}
        >
          {isThisPlaylistPlaying ? (
            <Pause className="w-6 h-6 fill-black" />
          ) : (
            <Play className="w-6 h-6 fill-black ml-0.5" />
          )}
        </button>

        {/* Shuffle */}
        <button
          onClick={toggleShuffle}
          className={`p-2 transition-colors ${
            isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
          }`}
          title="Trộn bài"
        >
          <Shuffle className="w-6 h-6" />
        </button>

        {/* Download All */}
        <button
          onClick={handleDownloadAll}
          disabled={isDownloadingAll || playlist.songs.length === 0}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Tải tất cả bài hát về máy"
        >
          {downloadAllSuccess ? (
            <Check className="w-6 h-6 text-[#1ed760]" />
          ) : (
            <Download
              className={`w-6 h-6 ${
                isDownloadingAll ? 'animate-bounce text-[#1ed760]' : ''
              }`}
            />
          )}
        </button>

        {/* Delete Playlist Button (if custom) */}
        {playlist.isCustom && (
          <button
            onClick={() => {
              if (confirm(`Bạn có chắc muốn xóa playlist "${playlist.title}"?`)) {
                deletePlaylist(playlist.id);
                window.location.href = '/library';
              }
            }}
            className="p-2 text-zinc-400 hover:text-red-400 transition-colors ml-auto"
            title="Xóa playlist này"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Song List Table */}
      <div className="px-4 md:px-8 pb-12">
        {/* Table Header */}
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

        {/* Rows */}
        {playlist.songs.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-3">
            <Music className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-base font-semibold text-white">Chưa có bài hát nào trong playlist này</p>
            <p className="text-xs text-zinc-500">
              Hãy chuyển sang trang &quot;Tìm Kiếm&quot; và bấm biểu tượng &quot;+&quot; để thêm bài hát vào đây!
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition-transform"
            >
              <PlusCircle className="w-4 h-4" />
              Tìm Nhạc Ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.songs.map((song, idx) => (
              <SongRow
                key={`${song.id}-${idx}`}
                song={song}
                index={idx}
                playlistContext={playlist.songs}
                onRemove={
                  playlist.isCustom
                    ? () => removeSongFromPlaylist(playlist.id, song.id)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
