'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X, Music, Loader2, Play, Headphones } from 'lucide-react';
import { Song } from '@/types';
import { CURATED_SONGS, GENRES } from '@/data/mockData';
import { SongRow } from '@/components/cards/SongRow';
import { useAudio } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { SafeImage as Image } from '@/components/ui/SafeImage';

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-zinc-400">Đang mở tìm kiếm…</p>}>
      <SearchFromUrl />
    </Suspense>
  );
}

function SearchFromUrl() {
  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const backgroundOnly = params.get('source') === 'audio';
  return (
    <SearchContent
      key={params.toString()}
      initialQuery={query}
      initialBackgroundOnly={backgroundOnly}
    />
  );
}

function SearchContent({ initialQuery, initialBackgroundOnly }: {
  initialQuery: string;
  initialBackgroundOnly: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [backgroundOnly, setBackgroundOnly] = useState(initialBackgroundOnly);
  const [searchResult, setSearchResult] = useState<{ url: string; songs: Song[]; failed?: boolean } | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const { playSong } = useAudio();
  const { offlineSongs, uploadedSongs } = useLibrary();
  const searchTerm = query.trim();
  const requestUrl = searchTerm
    ? `/api/search?q=${encodeURIComponent(searchTerm)}${backgroundOnly ? '&source=audio' : ''}`
    : '';
  const activeResult = searchResult?.url === requestUrl ? searchResult : null;
  const isLoading = Boolean(requestUrl && !activeResult);
  const localMatches = useMemo(() => {
    if (!backgroundOnly || !searchTerm) return new Map<string, Song>();
    const term = searchTerm.toLowerCase();
    const songs = [...offlineSongs, ...uploadedSongs].filter((song) =>
      song.audioUrl && !song.youtubeId && song.isFullTrack !== false &&
      [song.title, song.artist, `${song.title} ${song.artist}`].some((item) => item.toLowerCase().includes(term))
    );
    return new Map(songs.map((song) => [song.id, song]));
  }, [backgroundOnly, offlineSongs, searchTerm, uploadedSongs]);
  const genreMatches = selectedGenre === 'all'
    ? CURATED_SONGS
    : CURATED_SONGS.filter((song) => song.category?.toLowerCase().includes(selectedGenre.toLowerCase()));
  const results = searchTerm
    ? [...localMatches.values(), ...(activeResult?.songs ?? []).filter((song) => !localMatches.has(song.id))]
    : genreMatches.length ? genreMatches : CURATED_SONGS;

  // Search effect with debounce
  useEffect(() => {
    if (!requestUrl) return;
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(requestUrl, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search request failed');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSearchResult({ url: requestUrl, songs: data.songs || [], failed: data.offline === true });
        }
      } catch {
        if (!controller.signal.aborted) setSearchResult({ url: requestUrl, songs: [], failed: true });
      }
    }, initialQuery.trim() === searchTerm ? 0 : 400);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [initialQuery, requestUrl, searchTerm]);

  const handleGenreClick = (genreId: string) => {
    setSelectedGenre(genreId);
    setQuery('');
  };

  const topResult = results[0];

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Search Input Box */}
      <div className="max-w-xl">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3.5 sm:left-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bạn muốn nghe bài hát, nghệ sĩ hoặc thể loại gì?"
            className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-xs sm:text-sm rounded-full border border-transparent focus:border-zinc-500 focus:outline-none transition-all placeholder-zinc-400 shadow-inner"
            autoFocus={!initialQuery}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-pressed={backgroundOnly}
        onClick={() => setBackgroundOnly(!backgroundOnly)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors ${
          backgroundOnly
            ? 'border-[#1ed760]/50 bg-[#1ed760]/15 text-[#1ed760]'
            : 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
        }`}
      >
        <Headphones className="h-4 w-4" aria-hidden="true" />
        Nghe khi khóa màn hình
      </button>

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
      {results.length === 0 ? !isLoading && (
        <div className="py-16 text-center text-zinc-400 space-y-3">
          <Music className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-base font-semibold text-white">
            {activeResult?.failed
              ? 'Tìm kiếm trực tuyến đang gián đoạn'
              : backgroundOnly ? 'Chưa tìm thấy bản đầy đủ hỗ trợ nghe nền' : 'Không tìm thấy kết quả phù hợp'}
          </p>
          <p className="text-xs max-w-sm mx-auto">
            Thử tìm theo tên bài, tên nghệ sĩ hoặc tải file nhạc từ máy của bạn lên.
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
                    <span className="font-semibold text-zinc-200">{topResult.artist}</span> • {topResult.youtubeId ? 'YouTube' : 'Bài hát'}
                  </p>
                </div>

                <button
                  onClick={() => playSong(topResult, results)}
                  className="absolute bottom-5 right-5 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-100 sm:opacity-0 translate-y-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95"
                  title="Phát bài hát"
                  aria-label="Phát kết quả hàng đầu"
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
