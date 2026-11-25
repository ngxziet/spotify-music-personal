import type { Song } from '@/types';
import { creativeCommonsLicense } from './creativeCommons';

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
const OPEN_LICENSES = ['cc0', 'pdm', 'by', 'by-sa', 'by-nc', 'by-nc-sa', 'by-nd', 'by-nc-nd'];
const AUDIO_FORMATS = new Set(['mp3', 'mp31', 'mp32', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac']);

type OpenverseTrack = {
  id: string;
  title: string;
  creator: string | null;
  category: string;
  duration: number | null;
  filetype: string | null;
  url: string;
  thumbnail?: string | null;
  source?: string | null;
  foreign_landing_url: string;
  license: string;
  license_url: string;
};

export async function searchOpenverse(query: string, page = 1): Promise<Song[]> {
  const effectiveQuery = query.trim() || 'music';
  const params = new URLSearchParams({
    q: effectiveQuery,
    category: 'music',
    license: OPEN_LICENSES.join(','),
    page_size: '20',
    page: String(Math.max(1, page)),
    filter_dead: 'true',
  });

  try {
    const response = await fetch(`https://api.openverse.org/v1/audio/?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const { results } = await response.json() as { results?: OpenverseTrack[] };
    if (!Array.isArray(results)) return [];

    return results.flatMap((track): Song[] => {
      const duration = Math.round((track.duration ?? 0) / 1000);
      const cc = creativeCommonsLicense(track.license_url, true);
      if (
        track.category !== 'music' ||
        !track.id ||
        !track.title ||
        duration < 45 ||
        !OPEN_LICENSES.includes(track.license) ||
        !AUDIO_FORMATS.has(track.filetype ?? '') ||
        !track.url?.startsWith('https://') ||
        !track.foreign_landing_url?.startsWith('https://') ||
        !cc
      ) {
        return [];
      }

      const sourceLabel = track.source === 'jamendo' ? 'Jamendo (Openverse)' : 'Openverse';
      const coverUrl = track.thumbnail?.startsWith('https://') ? track.thumbnail : FALLBACK_ARTWORK;

      return [{
        id: `openverse-${track.id}`,
        title: track.title,
        artist: track.creator || 'Nghệ sĩ chưa rõ',
        album: `${sourceLabel} · ${cc.licenseName}`,
        duration,
        audioUrl: track.url,
        coverUrl,
        source: 'openverse',
        isFullTrack: true,
        attribution: {
          sourceUrl: track.foreign_landing_url,
          licenseUrl: cc.licenseUrl,
          licenseName: cc.licenseName,
        },
      }];
    });
  } catch {
    return [];
  }
}
