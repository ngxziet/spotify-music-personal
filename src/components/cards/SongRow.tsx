'use client';

import React, { useState } from 'react';
import { Song, Playlist } from '@/types';
import { useAudio } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { formatTime } from '@/utils/format';
import { Play, Pause, Heart, Download, Plus, Check, Trash2, Music2 } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/SafeImage';

interface SongRowProps {
  song: Song;
  index: number;
  playlistContext?: Song[];
  showAlbum?: boolean;
  onRemove?: () => void;
}

export function SongRow({ song, index, playlistContext, showAlbum = true, onRemove }: SongRowProps) {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio();
  const { isSongLiked, toggleLikeSong, downloadSong, playlists, addSongToPlaylist } = useLibrary();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const isCurrent = currentSong?.id === song.id;
  const isLiked = isSongLiked(song.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlistContext);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    const success = await downloadSong(song, true);
    setIsDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLikeSong(song);
  };

  const handleAddToPlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    addSongToPlaylist(playlistId, song);
    setShowPlaylistMenu(false);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative flex items-center justify-between px-3 md:px-4 py-2.5 rounded-md transition-colors cursor-pointer text-sm ${
        isCurrent ? 'bg-white/10 text-[#1ed760]' : 'hover:bg-white/5 text-zinc-300'
      }`}
    >
      {/* Left: Index & Play Icon + Cover & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-6 flex items-center justify-center text-zinc-400 font-mono text-xs">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-[2px] h-4">
              <span className="w-[3px] bg-[#1ed760] eq-bar-1"></span>
              <span className="w-[3px] bg-[#1ed760] eq-bar-2"></span>
              <span className="w-[3px] bg-[#1ed760] eq-bar-3"></span>
              <span className="w-[3px] bg-[#1ed760] eq-bar-4"></span>
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="w-4 h-4 text-white hidden group-hover:block fill-white" />
            </>
          )}
        </div>

        <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
          <Image
            src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'}
            alt={song.title}
            fill
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 pr-2">
          <p className={`font-medium truncate ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>
            {song.title}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {song.artist}
            {song.isLocal && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-zinc-700 text-zinc-300 font-medium">
                Local MP3
              </span>
            )}
            {song.source === 'itunes' && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium" title="Bản nghe thử 30s từ Apple iTunes">
                Preview 30s
              </span>
            )}
            {(song.source === 'audius' || song.source === 'curated' || song.isFullTrack) && !song.isLocal && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-[#1ed760]/20 text-[#1ed760] font-medium" title="Bản nhạc đầy đủ">
                Full Track
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Middle: Album Name (Desktop) */}
      {showAlbum && (
        <div className="hidden md:block flex-1 min-w-0 px-4 text-zinc-400 text-xs truncate">
          {song.album || 'Single'}
        </div>
      )}

      {/* Right: Actions & Duration */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`p-1.5 rounded-full transition-transform active:scale-90 ${
            isLiked ? 'text-[#1ed760]' : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
          title={isLiked ? 'Xóa khỏi bài hát yêu thích' : 'Thêm vào bài hát yêu thích'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
          title="Tải bài hát về máy (.mp3)"
        >
          {downloadSuccess ? (
            <Check className="w-4 h-4 text-[#1ed760]" />
          ) : (
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce text-[#1ed760]' : ''}`} />
          )}
        </button>

        {/* Add to Playlist Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPlaylistMenu(!showPlaylistMenu);
            }}
            className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
            title="Thêm vào playlist"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showPlaylistMenu && (
            <div
              className="absolute right-0 top-8 w-48 bg-[#282828] border border-zinc-700 rounded-md shadow-2xl py-1 z-50 text-xs text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-zinc-400 font-semibold border-b border-zinc-700">
                Thêm vào Playlist
              </div>
              <div className="max-h-40 overflow-y-auto">
                {playlists.length === 0 ? (
                  <div className="px-3 py-2 text-zinc-400">Chưa có playlist nào</div>
                ) : (
                  playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={(e) => handleAddToPlaylist(e, pl.id)}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center justify-between"
                    >
                      <span className="truncate">{pl.title}</span>
                      {pl.songs.some((s) => s.id === song.id) && (
                        <Check className="w-3.5 h-3.5 text-[#1ed760]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Optional Remove button (if in custom playlist view) */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
            title="Xóa khỏi danh sách này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Duration */}
        <span className="w-10 text-right text-xs text-zinc-400 font-mono">
          {formatTime(song.duration)}
        </span>
      </div>
    </div>
  );
}
