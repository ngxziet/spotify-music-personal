import { parse } from 'node-html-parser';
import type { Song } from '@/types';
import { creativeCommonsLicense } from './creativeCommons';

const DOGMAZIC_ORIGIN = 'https://play.dogmazic.net';
const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

export async function searchDogmazic(query: string, page = 1): Promise<Song[]> {
  const effectiveQuery = query.trim();
  if (!effectiveQuery) return [];

  const params = new URLSearchParams({
    action: 'search',
    object_type: 'song',
    rule_1: 'anywhere',
    rule_1_operator: '0',
    rule_1_input: effectiveQuery,
    limit: '45',
  });

  try {
    // Dogmazic provides these results and download links to anonymous listeners.
    const response = await fetch(`${DOGMAZIC_ORIGIN}/search.php?${params}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const rows = parse(await response.text()).querySelectorAll('tr');

    const songs = rows.flatMap((row): Song[] => {
      const song = row.querySelector('.cel_song a');
      const id = /\/song\.php\?action=show_song&song_id=(\d+)$/.exec(song?.getAttribute('href') ?? '')?.[1];
      const title = song?.text.trim();
      const time = row.querySelector('.cel_time')?.text.trim() ?? '';
      const license = creativeCommonsLicense(row.querySelector('.cel_license a')?.getAttribute('href'), true);
      if (!id || !title || !license || !/^\d+(?::[0-5]\d){1,2}$/.test(time)) return [];

      const duration = time.split(':').reduce((total, part) => total * 60 + Number(part), 0);
      const audioUrl = `${DOGMAZIC_ORIGIN}/stream.php?action=download&song_id=${id}`;
      const hasAudio = row.querySelectorAll('a.nohtml').some((link) => link.getAttribute('href') === audioUrl);
      if (duration < 45 || !hasAudio) return [];

      return [{
        id: `dogmazic-${id}`,
        title,
        artist: row.querySelector('.cel_artist')?.text.trim() || 'Nghệ sĩ chưa rõ',
        album: row.querySelector('.cel_album')?.text.trim() || 'Dogmazic',
        duration,
        audioUrl,
        coverUrl: FALLBACK_ARTWORK,
        source: 'dogmazic',
        isFullTrack: true,
        attribution: { ...license, sourceUrl: `${DOGMAZIC_ORIGIN}/song.php?action=show_song&song_id=${id}` },
      }];
    });

    const pageSize = 15;
    const start = (Math.max(1, page) - 1) * pageSize;
    return songs.slice(start, start + pageSize);
  } catch {
    return [];
  }
}
