'use client';

import React, { useState, useEffect } from 'react';
import { CURATED_SONGS, CURATED_PLAYLISTS, GENRES } from '@/data/mockData';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { SongRow } from '@/components/cards/SongRow';
import { Heart, Play, Pause, Sparkles, Flame, Headphones, Clock, History, ArrowRight, Radio, Compass } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';
import { formatRelativeTime } from '@/utils/format';
import type { Playlist, Song } from '@/types';
import Link from 'next/link';

export default function HomePage() {
  const { playlists, likedSongIds } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlay, history } = useAudio();
  const [greeting, setGreeting] = useState('Xin chào');
  const [liveTrending, setLiveTrending] = useState<Song[]>([]);
  const [livePlaylists, setLivePlaylists] = useState<Playlist[]>([]);
  const [liveRadio, setLiveRadio] = useState<Song[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Chào buổi sáng');
      else if (hour >= 12 && hour < 18) setGreeting('Chào buổi chiều');
      else setGreeting('Chào buổi tối');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/discover')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { trending?: Song[]; playlists?: Playlist[]; radio?: Song[] } | null) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.trending)) setLiveTrending(data.trending);
        if (Array.isArray(data.playlists)) setLivePlaylists(data.playlists);
        if (Array.isArray(data.radio)) setLiveRadio(data.radio);
      })
      .catch(() => {
        // Keep curated fallback on offline startup
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const likedCount = likedSongIds.length;
  const trendingSongs = liveTrending.length > 0 ? liveTrending : CURATED_SONGS;

  return (
    <div className="relative min-h-full">
      {/* Top Dynamic Gradient Banner */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-900/60 via-emerald-950/20 to-transparent pointer-events-none" />

      <div className="relative z-10 px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
        {/* Header Greeting */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>{greeting}</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <Link href="/search" className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
            Mở Kho Nhạc
          </Link>
        </div>

        {/* Top 6 Quick Cards Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Liked Songs Quick Card */}
          <Link
            href="/liked"
            className="group relative flex items-center bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-md overflow-hidden transition-all shadow-md cursor-pointer pr-3 sm:pr-4"
          >
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white" />
            </div>
            <div className="flex-1 px-3 min-w-0">
              <p className="font-bold text-xs sm:text-sm text-white truncate">Bài Hát Đã Thích</p>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{likedCount} bài hát</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const allLiked = CURATED_SONGS.filter((s) => likedSongIds.includes(s.id));
                if (allLiked.length > 0) {
                  playSong(allLiked[0], allLiked);
                } else {
                  playSong(trendingSongs[0], trendingSongs);
                }
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1ed760] text-black opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center shadow-lg transition-all scale-95 group-hover:scale-100 flex-shrink-0 hover:scale-105 active:scale-90"
              title="Phát bài hát đã thích"
              aria-label="Phát bài hát đã thích"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
            </button>
          </Link>

          {/* Quick Playlists */}
          {CURATED_PLAYLISTS.slice(0, 5).map((pl) => {
            const isThisPlPlaying = pl.songs.some((s) => s.id === currentSong?.id) && isPlaying;
            return (
              <Link
                key={pl.id}
                href={`/playlist/${pl.id}`}
                className="group relative flex items-center bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-md overflow-hidden transition-all shadow-md cursor-pointer pr-3 sm:pr-4"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-zinc-800 flex-shrink-0">
                  <Image src={pl.coverUrl} alt={pl.title} fill className="object-cover" />
                </div>
                <div className="flex-1 px-3 min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-white truncate">{pl.title}</p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{pl.songs.length} bài hát</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isThisPlPlaying) {
                      togglePlay();
                    } else if (pl.songs.length > 0) {
                      playSong(pl.songs[0], pl.songs);
                    }
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg transition-all flex-shrink-0 ${
                    isThisPlPlaying
                      ? 'opacity-100'
                      : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                  } hover:scale-105 active:scale-90`}
                  aria-label={isThisPlPlaying ? 'Tạm dừng playlist' : 'Phát playlist'}
                >
                  {isThisPlPlaying ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  )}
                </button>
              </Link>
            );
          })}
        </div>

        {/* Section: Đã Nghe Gần Đây (Recently Played) */}
        {history.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  Đã Nghe Gần Đây
                </h2>
                <p className="text-xs text-zinc-400">Tiếp tục thưởng thức các bài hát vừa nghe</p>
              </div>
              <Link
                href="/history"
                className="text-xs font-bold text-zinc-400 hover:text-white hover:underline flex items-center gap-1"
              >
                <span>Xem tất cả ({history.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.slice(0, 6).map((song) => {
                const isThisPlaying = currentSong?.id === song.id && isPlaying;
                return (
                  <div
                    key={`${song.id}-${song.playedAt || ''}`}
                    onClick={() => {
                      if (isThisPlaying) togglePlay();
                      else playSong(song, history);
                    }}
                    className="group relative p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-2.5 shadow-md">
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isThisPlaying) togglePlay();
                          else playSong(song, history);
                        }}
                        className={`absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all ${
                          isThisPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 scale-95 group-hover:scale-100'
                        } hover:scale-105 active:scale-95`}
                      >
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        )}
                      </button>
                    </div>
                    <p className={`font-semibold text-xs truncate ${isThisPlaying ? 'text-[#1ed760]' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                    {song.playedAt && (
                      <p className="text-[10px] text-zinc-500 truncate mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(song.playedAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section: Khám Phá Theo Thể Loại */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#1ed760]" />
              Khám Phá Theo Thể Loại
            </h2>
            <Link href="/search" className="text-xs font-bold text-zinc-400 hover:text-white hover:underline">
              Xem kho nhạc
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {GENRES.filter((g) => g.id !== 'all').map((genre) => (
              <Link
                key={genre.id}
                href={`/search?genre=${encodeURIComponent(genre.id)}`}
                className={`rounded-lg p-3.5 bg-gradient-to-br ${genre.color} hover:brightness-110 transition-all shadow-md font-bold text-xs sm:text-sm text-white truncate`}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Section: Thịnh Hành Toàn Cầu (Live Multi-Catalog Tracks) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                Thịnh Hành Hôm Nay
              </h2>
              <p className="text-xs text-zinc-400">
                Tổng hợp từ Audius, Openverse / Jamendo và Free Music Archive
              </p>
            </div>
            <Link href="/search" className="text-xs font-bold text-zinc-400 hover:text-white hover:underline">
              Tìm thêm
            </Link>
          </div>

          <div className="bg-black/20 rounded-xl p-2 md:p-3 border border-white/5 space-y-1">
            {trendingSongs.slice(0, 12).map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                playlistContext={trendingSongs}
              />
            ))}
          </div>
        </section>

        {/* Section: Playlist Thịnh Hành */}
        {livePlaylists.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-[#1ed760]" />
                  Playlist Thịnh Hành Toàn Cầu
                </h2>
                <p className="text-xs text-zinc-400">Các danh sách phát nổi bật từ Audius</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {livePlaylists.slice(0, 5).map((pl) => (
                <PlaylistCard key={pl.id} playlist={pl} />
              ))}
            </div>
          </section>
        )}

        {/* Section: Tuyển Chọn Cho Bạn */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Headphones className="w-5 h-5 text-[#1ed760]" />
                Dành Cho Bạn
              </h2>
              <p className="text-xs text-zinc-400">Các danh sách phát cá nhân và tuyển chọn</p>
            </div>
            <Link
              href="/library"
              className="text-xs font-bold text-zinc-400 hover:text-white hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.slice(0, 5).map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </section>

        {/* Section: Radio 24/7 Trực Tiếp */}
        {liveRadio.length > 0 && (
          <section className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  Đài Radio Âm Nhạc 24/7
                </h2>
                <p className="text-xs text-zinc-400">Phát trực tiếp liên tục không giới hạn từ Radio Browser</p>
              </div>
              <Link
                href="/search?source=radio"
                className="text-xs font-bold text-zinc-400 hover:text-white hover:underline"
              >
                Xem tất cả đài
              </Link>
            </div>

            <div className="bg-black/20 rounded-xl p-2 md:p-3 border border-white/5 space-y-1">
              {liveRadio.slice(0, 6).map((station, idx) => (
                <SongRow
                  key={station.id}
                  song={station}
                  index={idx}
                  playlistContext={liveRadio}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
