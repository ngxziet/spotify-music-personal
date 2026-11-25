import type { Song } from '@/types';
import { creativeCommonsLicense } from './creativeCommons';

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'application/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
]);
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type WikimediaPage = {
  pageid?: number;
  title?: string;
  imageinfo?: Array<{
    url?: string;
    mime?: string;
    size?: number;
    duration?: number;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
      LicenseUrl?: { value?: string };
      ObjectName?: { value?: string };
    };
  }>;
};

function stripHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanFileTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^File:/i, '')
    .replace(/\.(mp3|ogg|oga|opus|wav|flac|m4a|webm)$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

export async function searchWikimedia(query: string, page = 1): Promise<Song[]> {
  const effectiveQuery = query.trim() || 'classical piano';
  const offset = (Math.max(1, page) - 1) * 20;
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:audio ${effectiveQuery}`,
    gsrnamespace: '6',
    gsrlimit: '20',
    gsroffset: String(offset),
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    format: 'json',
  });

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SoundWaveMusicApp/1.0 (https://spotify-music-personal.vercel.app)',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { query?: { pages?: Record<string, WikimediaPage> } };
    const pages = Object.values(data.query?.pages ?? {});

    return pages.flatMap((item): Song[] => {
      const info = item.imageinfo?.[0];
      const url = info?.url?.split('?')[0];
      const duration = Math.round(info?.duration ?? 0);
      if (
        !item.pageid ||
        !item.title ||
        !url?.startsWith('https://upload.wikimedia.org/') ||
        !ALLOWED_MIMES.has(info?.mime ?? '') ||
        (info?.size ?? 0) > MAX_FILE_BYTES ||
        duration < 45
      ) {
        return [];
      }

      const meta = info?.extmetadata;
      const cc = creativeCommonsLicense(meta?.LicenseUrl?.value, true);
      const isPublicDomain = /public domain|cc0/i.test(meta?.LicenseShortName?.value ?? '');
      const license = cc ?? (isPublicDomain
        ? {
            licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
            licenseName: 'Public Domain',
          }
        : undefined);
      if (!license) return [];

      const title = stripHtml(meta?.ObjectName?.value) || cleanFileTitle(item.title);
      const artist = stripHtml(meta?.Artist?.value).slice(0, 80) || 'Wikimedia Commons';

      return [{
        id: `wikimedia-${item.pageid}`,
        title,
        artist,
        album: `Wikimedia Commons · ${license.licenseName}`,
        duration,
        audioUrl: url,
        coverUrl: FALLBACK_ARTWORK,
        source: 'wikimedia',
        isFullTrack: true,
        attribution: {
          ...license,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        },
      }];
    });
  } catch {
    return [];
  }
}
