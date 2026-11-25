import { NextRequest, NextResponse } from 'next/server';
import { CURATED_SONGS } from '@/data/mockData';
import type { Song } from '@/types';
import { audiusStreamUrl } from '@/utils/audioSource';
import { searchArchive } from './archive';

type AudiusTrack = {
  id?: string;
  title?: string;
  user?: { name?: string };
  genre?: string;
  duration?: number;
  artwork?: { '480x480'?: string };
  is_streamable?: boolean;
  access?: { stream?: boolean };
};

type OpenverseTrack = {
  id: string;
  title: string;
  creator: string | null;
  category: string;
  duration: number | null;
  filetype: string | null;
  url: string;
  foreign_landing_url: string;
  license: string;
  license_url: string;
};

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
const OPEN_LICENSES = new Set(['cc0', 'pdm', 'by', 'by-sa']);
const AUDIO_FORMATS = new Set(['mp3', 'mp31', 'mp32', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac']);

async function getAudiusTracks(query: string): Promise<Song[] | null> {
  const endpoint = query ? 'search' : 'trending';
  const params = new URLSearchParams({ limit: '20', app_name: 'SoundWave' });
  if (query) params.set('query', query);
  else params.set('time', 'week');

  try {
    const response = await fetch(`https://api.audius.co/v1/tracks/${endpoint}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data?: AudiusTrack[] };
    if (!Array.isArray(data)) return null;

    return data
      .filter((track): track is AudiusTrack & { id: string; title: string } =>
        Boolean(track.id && track.title && track.is_streamable === true && track.access?.stream !== false)
      )
      .slice(0, 15)
      .map((track) => ({
        id: `audius-${track.id}`,
        title: track.title,
        artist: track.user?.name || 'Audius Artist',
        album: track.genre || 'Single',
        duration: track.duration || 180,
        audioUrl: audiusStreamUrl(track.id),
        coverUrl: track.artwork?.['480x480'] || FALLBACK_ARTWORK,
        category: track.genre || 'Electronic',
        source: 'audius',
        isFullTrack: true,
      }));
  } catch {
    return null;
  }
}

async function getOpenverseTracks(query: string): Promise<Song[]> {
  const params = new URLSearchParams({
    q: query,
    category: 'music',
    license: [...OPEN_LICENSES].join(','),
    page_size: '12',
    filter_dead: 'true',
  });
  try {
    const response = await fetch(`https://api.openverse.org/v1/audio/?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];
    const { results } = await response.json() as { results?: OpenverseTrack[] };
    if (!Array.isArray(results)) return [];

    return results.flatMap((track): Song[] => {
      const duration = Math.round((track.duration ?? 0) / 1000);
      if (track.category !== 'music' || !track.id || !track.title || duration < 45
        || !OPEN_LICENSES.has(track.license) || !AUDIO_FORMATS.has(track.filetype ?? '')
        || !track.url?.startsWith('https://') || !track.foreign_landing_url?.startsWith('https://')
        || !track.license_url?.startsWith('https://creativecommons.org/')) return [];

      return [{
        id: `openverse-${track.id}`,
        title: track.title,
        artist: track.creator || 'Nghệ sĩ chưa rõ',
        album: 'Nhạc có giấy phép mở',
        duration,
        audioUrl: track.url,
        coverUrl: FALLBACK_ARTWORK,
        source: 'openverse',
        isFullTrack: true,
        attribution: {
          sourceUrl: track.foreign_landing_url,
          licenseUrl: track.license_url,
          licenseName: track.license.toUpperCase(),
        },
      }];
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().slice(0, 200) ?? '';
  const term = query.toLowerCase();
  const curated = CURATED_SONGS.filter((song) =>
    [song.title, song.artist, song.album, song.category].some((text) => text?.toLowerCase().includes(term))
  ).map((song) => ({ ...song, isFullTrack: true }));
  const [audioTracks, openTracks, archiveTracks] = await Promise.all([
    getAudiusTracks(query),
    query ? getOpenverseTracks(query) : Promise.resolve([]),
    query ? searchArchive(query) : Promise.resolve([]),
  ]);
  const songs = query
    ? [...curated, ...(audioTracks ?? []), ...openTracks, ...archiveTracks]
    : [...(audioTracks ?? []), ...curated];
  const seen = new Set<string>();
  const unique = songs.filter((song) => {
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ songs: unique, catalogUnavailable: audioTracks === null && openTracks.length === 0 && archiveTracks.length === 0 });
}
