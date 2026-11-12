'use client';

import React from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { CURATED_SONGS } from '@/data/mockData';
import { SongRow } from '@/components/cards/SongRow';
import { formatTime } from '@/utils/format';
import { Heart, Play, Pause, Shuffle, Music, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LikedSongsPage() {
  const { likedSongIds, offlineSongs, uploadedSongs } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlay, isShuffle, toggleShuffle } = useAudio();

  // Combine all known song pools to find liked ones
  const allSongPool = [...CURATED_SONGS, ...offlineSongs, ...uploadedSongs];
  const likedSongs = allSongPool.filter((song) => likedSongIds.includes(song.id));

  // Remove duplicates
  const seen = new Set<string>();
  const uniqueLikedSongs = likedSongs.filter((song) => {
    if (seen.has(song.id)) return false;
    seen.add(song.id);
    return true;
  });

  const isLikedPlaying =
    uniqueLikedSongs.some((s) => s.id === currentSong?.id) && isPlaying;

  const totalDuration = uniqueLikedSongs.reduce((acc, song) => acc + (song.duration || 0), 0);

  const handlePlayAll = () => {
    if (isLikedPlaying) {
      togglePlay();
    } else if (uniqueLikedSongs.length > 0) {
      playSong(uniqueLikedSongs[0], uniqueLikedSongs);
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Top Purple Gradient Header */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-indigo-700 via-purple-900 to-[#121212] flex flex-col md:flex-row items-start md:items-end gap-6 shadow-xl">
        {/* Heart Large Card */}
        <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/10">
          <Heart className="w-24 h-24 fill-white text-white drop-shadow-lg" />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2 text-white">
          <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-300">
            PLAYLIST
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight">
            Bài Hát Đã Thích
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 line-clamp-1 pt-1">
            Tuyển tập các bài hát bạn yêu thích nhất trên Spotify
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium pt-2">
            <span className="font-bold text-white">Bộ sưu tập cá nhân</span>
            <span>•</span>
            <span>{uniqueLikedSongs.length} bài hát</span>
            <span>•</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-5 flex items-center gap-4">
        <button
          onClick={handlePlayAll}
          disabled={uniqueLikedSongs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          title={isLikedPlaying ? 'Tạm dừng' : 'Phát tất cả'}
        >
          {isLikedPlaying ? (
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

        {uniqueLikedSongs.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-3">
            <Heart className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-base font-semibold text-white">Chưa có bài hát yêu thích nào</p>
            <p className="text-xs text-zinc-500">
              Nhấn vào biểu tượng trái tim ở bất kỳ bài hát nào để thêm vào đây.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition-transform"
            >
              Khám Phá Nhạc Ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {uniqueLikedSongs.map((song, idx) => (
              <SongRow
                key={`liked-${song.id}`}
                song={song}
                index={idx}
                playlistContext={uniqueLikedSongs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
