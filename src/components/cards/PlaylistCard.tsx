'use client';

import React from 'react';
import { Playlist } from '@/types';
import { useAudio } from '@/context/AudioContext';
import { Play, Pause } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio();

  const isCurrentPlaylist = playlist.songs.some((s) => s.id === currentSong?.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentPlaylist) {
      togglePlay();
    } else if (playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs);
    }
  };

  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group relative flex flex-col p-4 bg-[#181818] hover:bg-[#282828] rounded-lg transition-all duration-300 hover:shadow-xl cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-4 shadow-md">
        <Image
          src={playlist.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'}
          alt={playlist.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Floating Green Play Button */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrentPlaylist && isPlaying ? 'Tạm dừng playlist' : 'Phát playlist'}
          className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
            isCurrentPlaylist && isPlaying
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrentPlaylist && isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black ml-0.5" />
          )}
        </button>
      </div>

      {/* Playlist Meta */}
      <h3 className="font-semibold text-white text-base truncate mb-1">
        {playlist.title}
      </h3>
      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
        {playlist.description || `${playlist.songs.length} bài hát`}
      </p>
    </Link>
  );
}
