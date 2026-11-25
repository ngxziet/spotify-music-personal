import { parse } from 'node-html-parser';
import type { Song } from '@/types';
import { creativeCommonsLicense } from './creativeCommons';

const DOGMAZIC_ORIGIN = 'https://play.dogmazic.net';

export async function searchDogmazic(query: string): Promise<Song[]> {
  const params = new URLSearchParams({
    action: 'search',
    object_type: 'song',
    rule_1: 'anywhere',
    rule_1_operator: '0',
    rule_1_input: query,
    limit: '25',
  });

  try {
    // Dogmazic provides these results and download links to anonymous listeners.
    const response = await fetch(`${DOGMAZIC_ORIGIN}/search.php?${params}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];
    const rows = parse(await response.text()).querySelectorAll('tr');

    return rows.flatMap((row): Song[] => {
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
        coverUrl: '',
        source: 'dogmazic',
        isFullTrack: true,
        attribution: { ...license, sourceUrl: `${DOGMAZIC_ORIGIN}/song.php?action=show_song&song_id=${id}` },
      }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}
