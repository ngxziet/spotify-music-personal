'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search as SearchIcon, X, Music, Sparkles, Loader2, Play } from 'lucide-react';
import { Song } from '@/types';
import { CURATED_SONGS, GENRES } from '@/data/mockData';
import { SongRow } from '@/components/cards/SongRow';
import { useAudio } from '@/context/AudioContext';
import Image from 'next/image';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>(CURATED_SONGS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const { playSong } = useAudio();

  // Search effect with debounce
  useEffect(() => {
    if (!query.trim()) {
      if (selectedGenre === 'all') {
        setResults(CURATED_SONGS);
      } else {
        const filtered = CURATED_SONGS.filter((s) =>
          s.category?.toLowerCase().includes(selectedGenre.toLowerCase())
        );
        setResults(filtered.length > 0 ? filtered : CURATED_SONGS);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.songs || []);
        }
      } catch (err) {
        console.error('Search request failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query, selectedGenre]);

  const handleGenreClick = (genreId: string) => {
    setSelectedGenre(genreId);
    setQuery('');
    if (genreId === 'all') {
      setResults(CURATED_SONGS);
    } else {
      const filtered = CURATED_SONGS.filter((s) =>
        s.category?.toLowerCase().includes(genreId.toLowerCase())
      );
      setResults(filtered.length > 0 ? filtered : CURATED_SONGS);
    }
  };

  const topResult = results[0];

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      {/* Search Input Box */}
      <div className="max-w-xl">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bạn muốn nghe bài hát, nghệ sĩ hoặc thể loại gì?"
            className="w-full pl-12 pr-10 py-3 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-sm rounded-full border border-transparent focus:border-zinc-500 focus:outline-none transition-all placeholder-zinc-400 shadow-inner"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 p-1 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            onClick={() => handleGenreClick(genre.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedGenre === genre.id
                ? 'bg-white text-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#1ed760]" />
              <span>Đang tìm kiếm...</span>
            </>
          ) : query ? (
            <span>Kết quả cho &quot;{query}&quot; ({results.length})</span>
          ) : (
            <span>Khám Phá Bài Hát</span>
          )}
        </h2>
      </div>

      {/* Results Display */}
      {results.length === 0 && !isLoading ? (
        <div className="py-16 text-center text-zinc-400 space-y-3">
          <Music className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-base font-semibold text-white">Không tìm thấy kết quả phù hợp</p>
          <p className="text-xs max-w-sm mx-auto">
            Hãy thử tìm bằng từ khóa khác (ví dụ: &quot;Son Tung&quot;, &quot;Taylor Swift&quot;, &quot;Chill&quot;, &quot;Lofi&quot;) hoặc tải file nhạc từ máy của bạn lên.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Result Card & Top 4 (Spotify Layout) */}
          {query && topResult && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Big Top Result Card */}
              <div className="lg:col-span-2 bg-[#181818] hover:bg-[#282828] p-5 rounded-xl transition-all group flex flex-col justify-between relative shadow-lg">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
                    Kết Quả Hàng Đầu
                  </h3>
                  <div className="relative aspect-square w-28 rounded-lg overflow-hidden mb-4 bg-zinc-800 shadow-md">
                    <Image
                      src={topResult.coverUrl}
                      alt={topResult.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h4 className="text-2xl font-extrabold text-white truncate mb-1">
                    {topResult.title}
                  </h4>
                  <p className="text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-200">{topResult.artist}</span> • Bài hát
                  </p>
                </div>

                <button
                  onClick={() => playSong(topResult, results)}
                  className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105"
                  title="Phát bài hát"
                >
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                </button>
              </div>

              {/* Top 4 Tracks */}
              <div className="lg:col-span-3 space-y-1">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Bài Hát Phổ Biến
                </h3>
                {results.slice(0, 4).map((song, idx) => (
                  <SongRow
                    key={`top-${song.id}`}
                    song={song}
                    index={idx}
                    playlistContext={results}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Full Tracks List */}
          <div className="space-y-1 pt-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Tất Cả Bài Hát
            </h3>
            <div className="bg-black/20 rounded-xl p-2 md:p-3 border border-white/5 space-y-1">
              {results.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  playlistContext={results}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
