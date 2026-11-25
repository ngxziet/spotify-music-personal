'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X, Music, Loader2, Play, Radio, ChevronDown } from 'lucide-react';
import { Song } from '@/types';
import { CURATED_SONGS, GENRES } from '@/data/mockData';
import { SongRow } from '@/components/cards/SongRow';
import { useAudio } from '@/context/AudioContext';
import { useLibrary } from '@/context/LibraryContext';
import { isPlayableSong } from '@/utils/audioSource';
import { SafeImage as Image } from '@/components/ui/SafeImage';

const CATALOG_SOURCES = [
  { id: 'all', name: 'Tất cả kho' },
  { id: 'audius', name: 'Audius' },
  { id: 'podcast', name: 'Nhạc & Podcast VN' },
  { id: 'openverse', name: 'Openverse / Jamendo' },
  { id: 'archive', name: 'Internet Archive' },
  { id: 'wikimedia', name: 'Wikimedia' },
  { id: 'dogmazic', name: 'Dogmazic' },
  { id: 'radio', name: 'Radio 24/7' },
];

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
  const genre = params.get('genre') ?? 'all';
  const source = params.get('source') ?? 'all';
  return (
    <SearchContent
      key={`${query}|${genre}|${source}`}
      initialQuery={query}
      initialGenre={genre}
      initialSource={source}
    />
  );
}

function SearchContent({
  initialQuery,
  initialGenre,
  initialSource,
}: {
  initialQuery: string;
  initialGenre: string;
  initialSource: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const [page, setPage] = useState(1);
  const [searchResult, setSearchResult] = useState<{
    baseKey: string;
    songs: Song[];
    hasMore: boolean;
    failed?: boolean;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { playSong } = useAudio();
  const { offlineSongs, uploadedSongs } = useLibrary();
  const searchTerm = query.trim();

  const baseKey = `${searchTerm}|${selectedGenre}|${selectedSource}`;
  const buildRequestUrl = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (searchTerm) sp.set('q', searchTerm);
    if (selectedGenre !== 'all') sp.set('genre', selectedGenre);
    if (selectedSource !== 'all') sp.set('source', selectedSource);
    if (targetPage > 1) sp.set('page', String(targetPage));
    const qs = sp.toString();
    return qs ? `/api/search?${qs}` : '/api/search';
  };

  const activeResult = searchResult?.baseKey === baseKey ? searchResult : null;
  const isLoading = !activeResult;

  const localMatches = useMemo(() => {
    if (!searchTerm || selectedSource === 'radio' || selectedGenre === 'radio') {
      return new Map<string, Song>();
    }
    const term = searchTerm.toLowerCase();
    const songs = [...offlineSongs, ...uploadedSongs].filter(
      (song) =>
        isPlayableSong(song) &&
        [song.title, song.artist, `${song.title} ${song.artist}`].some((item) =>
          item.toLowerCase().includes(term)
        )
    );
    return new Map(songs.map((song) => [song.id, song]));
  }, [offlineSongs, searchTerm, selectedGenre, selectedSource, uploadedSongs]);

  const genreMatches =
    selectedGenre === 'all'
      ? CURATED_SONGS
      : CURATED_SONGS.filter((song) =>
          song.category?.toLowerCase().includes(selectedGenre.toLowerCase())
        );

  const onlineSongs = activeResult?.songs.filter(isPlayableSong);
  const results = searchTerm
    ? [...localMatches.values(), ...(onlineSongs ?? []).filter((song) => !localMatches.has(song.id))]
    : onlineSongs?.length
      ? onlineSongs
      : selectedSource === 'all' && selectedGenre !== 'radio'
        ? genreMatches.length
          ? genreMatches
          : CURATED_SONGS
        : [];

  useEffect(() => {
    const controller = new AbortController();
    const url = buildRequestUrl(1);
    const delay = !searchTerm || initialQuery.trim() === searchTerm ? 0 : 400;

    const handler = setTimeout(async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Search request failed');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setPage(1);
          setSearchResult({
            baseKey,
            songs: data.songs || [],
            hasMore: Boolean(data.hasMore),
            failed: data.offline === true || data.catalogUnavailable === true,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchResult({ baseKey, songs: [], hasMore: false, failed: true });
        }
      }
    }, delay);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  const handleLoadMore = async () => {
    if (loadingMore || !activeResult?.hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(buildRequestUrl(nextPage));
      if (!res.ok) throw new Error('Load more failed');
      const data = await res.json();
      const incoming: Song[] = data.songs || [];
      setPage(nextPage);
      setSearchResult((prev) => {
        if (!prev || prev.baseKey !== baseKey) return prev;
        const existingIds = new Set(prev.songs.map((s) => s.id));
        const merged = [...prev.songs, ...incoming.filter((s) => !existingIds.has(s.id))];
        return {
          ...prev,
          songs: merged,
          hasMore: Boolean(data.hasMore) && incoming.length > 0,
        };
      });
    } catch {
      // Keep existing results if pagination fails
    } finally {
      setLoadingMore(false);
    }
  };

  const handleGenreClick = (genreId: string) => {
    setSelectedGenre(genreId);
    if (genreId === 'radio') {
      setSelectedSource('radio');
    } else if (selectedSource === 'radio') {
      setSelectedSource('all');
    }
    setQuery('');
  };

  const handleSourceClick = (sourceId: string) => {
    setSelectedSource(sourceId);
    if (sourceId === 'radio') {
      setSelectedGenre('radio');
    } else if (selectedGenre === 'radio') {
      setSelectedGenre('all');
    }
  };

  const topResult = results[0];

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Search Input Box */}
      <div className="max-w-xl">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3.5 sm:left-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bài hát, nghệ sĩ, thể loại hoặc đài radio..."
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

      <p className="text-xs text-zinc-300">
        Kho nhạc hợp nhất: Audius, Nhạc &amp; Podcast VN (Apple Podcasts RSS), Openverse / Jamendo, Internet Archive, Wikimedia Commons, Dogmazic, Radio 24/7 và nhạc trên máy.
      </p>

      {/* Catalog Source Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATALOG_SOURCES.map((src) => (
          <button
            key={src.id}
            onClick={() => handleSourceClick(src.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSource === src.id
                ? 'bg-[#1ed760] text-black'
                : 'bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            {src.id === 'radio' && <Radio className="w-3.5 h-3.5" />}
            <span>{src.name}</span>
          </button>
        ))}
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
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#1ed760]" />
              <span>Đang tìm trong kho nhạc...</span>
            </>
          ) : query ? (
            <span>Kết quả cho &quot;{query}&quot; ({results.length})</span>
          ) : selectedSource === 'radio' || selectedGenre === 'radio' ? (
            <span>Đài Radio Trực Tiếp 24/7 ({results.length})</span>
          ) : (
            <span>
              {selectedGenre === 'all'
                ? `Khám phá kho nhạc (${results.length})`
                : `${GENRES.find((g) => g.id === selectedGenre)?.name ?? selectedGenre} (${results.length})`}
            </span>
          )}
        </h2>
      </div>

      {/* Results Display */}
      {results.length === 0 ? (
        !isLoading && (
          <div className="py-16 text-center text-zinc-400 space-y-3">
            <Music className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-base font-semibold text-white">
              {activeResult?.failed
                ? 'Tìm kiếm trực tuyến đang gián đoạn'
                : 'Chưa tìm thấy bản đầy đủ phù hợp'}
            </p>
            <p className="text-xs max-w-sm mx-auto">
              Thử đổi nguồn kho nhạc phía trên, tìm từ khóa tiếng Anh (lofi, chill, piano, pop, edm...) hoặc tải file nhạc từ máy lên.
            </p>
          </div>
        )
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
                    <span className="font-semibold text-zinc-200">{topResult.artist}</span>
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
              Tất Cả Bài Hát ({results.length})
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

          {/* Load More Pagination */}
          {activeResult?.hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1ed760]" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-[#1ed760]" />
                    <span>Tải thêm bài hát</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
