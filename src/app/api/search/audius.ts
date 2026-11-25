import type { Playlist, Song } from '@/types';
import { audiusStreamUrl } from '@/utils/audioSource';

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

type AudiusTrack = {
  id?: string;
  title?: string;
  user?: { name?: string };
  genre?: string;
  duration?: number;
  artwork?: { '480x480'?: string; '150x150'?: string };
  is_streamable?: boolean;
  access?: { stream?: boolean };
};

type AudiusPlaylist = {
  id?: string;
  playlist_name?: string;
  description?: string;
  user?: { name?: string };
  artwork?: { '480x480'?: string; '150x150'?: string };
  tracks?: AudiusTrack[];
};

const AUDIUS_GENRE_MAP: Record<string, string> = {
  pop: 'Pop',
  edm: 'Electronic',
  electronic: 'Electronic',
  lofi: 'Lo-Fi',
  piano: 'Classical',
  acoustic: 'Acoustic',
  rock: 'Rock',
  jazz: 'Jazz',
  hiphop: 'Hip-Hop/Rap',
  ambient: 'Ambient',
};

function mapAudiusTrack(track: AudiusTrack): Song | null {
  if (!track.id || !track.title || track.is_streamable !== true || track.access?.stream === false) {
    return null;
  }
  return {
    id: `audius-${track.id}`,
    title: track.title,
    artist: track.user?.name || 'Audius Artist',
    album: track.genre || 'Single',
    duration: track.duration || 180,
    audioUrl: audiusStreamUrl(track.id),
    coverUrl: track.artwork?.['480x480'] || track.artwork?.['150x150'] || FALLBACK_ARTWORK,
    category: track.genre || 'Electronic',
    source: 'audius',
    isFullTrack: true,
  };
}

async function fetchAudiusTrackList(path: string, params: URLSearchParams): Promise<Song[] | null> {
  try {
    const response = await fetch(`https://api.audius.co/v1/${path}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data?: AudiusTrack[] };
    if (!Array.isArray(data)) return null;
    return data.map(mapAudiusTrack).filter((song): song is Song => song !== null);
  } catch {
    return null;
  }
}

export async function searchAudius(
  query: string,
  opts: { genre?: string; page?: number; limit?: number } = {}
): Promise<Song[] | null> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, opts.limit ?? 35);
  const offset = (page - 1) * limit;

  const audiusGenre = opts.genre ? AUDIUS_GENRE_MAP[opts.genre.toLowerCase()] : undefined;

  if (query) {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      offset: String(offset),
      app_name: 'SoundWave',
    });
    if (audiusGenre) params.set('genre', audiusGenre);
    return fetchAudiusTrackList('tracks/search', params);
  }

  const trendingParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    time: 'week',
    app_name: 'SoundWave',
  });
  if (audiusGenre) trendingParams.set('genre', audiusGenre);

  if (page === 1 && !audiusGenre) {
    const undergroundParams = new URLSearchParams({
      limit: '15',
      app_name: 'SoundWave',
    });
    const [trending, underground] = await Promise.all([
      fetchAudiusTrackList('tracks/trending', trendingParams),
      fetchAudiusTrackList('tracks/trending/underground', undergroundParams),
    ]);
    if (trending === null && underground === null) return null;
    return [...(trending ?? []), ...(underground ?? [])];
  }

  return fetchAudiusTrackList('tracks/trending', trendingParams);
}

export async function searchAudiusMulti(
  queries: string[],
  opts: { page?: number; limitPerQuery?: number } = {}
): Promise<Song[]> {
  const limit = opts.limitPerQuery ?? 15;
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * limit;
  const lists = await Promise.all(
    queries.map((q) =>
      fetchAudiusTrackList(
        'tracks/search',
        new URLSearchParams({
          query: q,
          limit: String(limit),
          offset: String(offset),
          app_name: 'SoundWave',
        })
      )
    )
  );
  return lists.flatMap((list) => list ?? []);
}

export async function getAudiusTrendingPlaylists(limit = 8): Promise<Playlist[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    time: 'week',
    app_name: 'SoundWave',
  });
  try {
    const response = await fetch(`https://api.audius.co/v1/playlists/trending?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const { data } = await response.json() as { data?: AudiusPlaylist[] };
    if (!Array.isArray(data)) return [];

    return data.flatMap((pl): Playlist[] => {
      if (!pl.id || !pl.playlist_name) return [];
      const songs = (pl.tracks ?? [])
        .map(mapAudiusTrack)
        .filter((song): song is Song => song !== null);
      if (songs.length === 0) return [];
      return [{
        id: `audius-pl-${pl.id}`,
        title: pl.playlist_name,
        description: pl.description?.trim() || `${pl.user?.name || 'Audius'} • ${songs.length} bài hát`,
        coverUrl: pl.artwork?.['480x480'] || pl.artwork?.['150x150'] || songs[0].coverUrl || FALLBACK_ARTWORK,
        songs,
        artist: pl.user?.name || 'Audius',
        isCustom: false,
      }];
    });
  } catch {
    return [];
  }
}

export async function getAudiusPlaylistById(playlistId: string): Promise<Playlist | null> {
  const cleanId = playlistId.replace(/^audius-pl-/, '');
  if (!/^[a-zA-Z0-9]+$/.test(cleanId)) return null;
  try {
    const response = await fetch(`https://api.audius.co/v1/playlists/${cleanId}?app_name=SoundWave`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data?: AudiusPlaylist[] };
    const pl = Array.isArray(data) ? data[0] : undefined;
    if (!pl?.id || !pl.playlist_name) return null;
    const songs = (pl.tracks ?? [])
      .map(mapAudiusTrack)
      .filter((song): song is Song => song !== null);
    if (songs.length === 0) return null;
    return {
      id: `audius-pl-${pl.id}`,
      title: pl.playlist_name,
      description: pl.description?.trim() || `${pl.user?.name || 'Audius'} • ${songs.length} bài hát`,
      coverUrl: pl.artwork?.['480x480'] || pl.artwork?.['150x150'] || songs[0].coverUrl || FALLBACK_ARTWORK,
      songs,
      artist: pl.user?.name || 'Audius',
      isCustom: false,
    };
  } catch {
    return null;
  }
}
