import type { Song } from '@/types';

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
const AUDIO_MIME_RE = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|ogg)/i;
const AUDIO_EXT_RE = /\.(mp3|m4a|aac|ogg)(?:[?#]|$)/i;

type ITunesPodcast = {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
};

function decodeXmlText(raw?: string): string {
  if (!raw) return '';
  return raw
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
  return decodeXmlText(match?.[1]);
}

function parseDurationSeconds(raw: string): number {
  if (!raw) return 180;
  if (/^\d+$/.test(raw)) return Number(raw);
  if (/^\d+(?::[0-5]?\d){1,2}$/.test(raw)) {
    return raw.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  }
  return 180;
}

async function parseFeedEpisodes(podcast: ITunesPodcast, maxEpisodes: number): Promise<Song[]> {
  if (!podcast.feedUrl?.startsWith('https://')) return [];
  try {
    const res = await fetch(podcast.feedUrl, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemMatches = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
    const cover =
      podcast.artworkUrl600?.startsWith('https://')
        ? podcast.artworkUrl600
        : podcast.artworkUrl100?.startsWith('https://')
          ? podcast.artworkUrl100
          : FALLBACK_ARTWORK;

    const songs: Song[] = [];
    for (let idx = 0; idx < itemMatches.length && songs.length < maxEpisodes; idx += 1) {
      const block = itemMatches[idx];
      const encTag = /<enclosure\b([^>]*)\/?>/i.exec(block)?.[1] ?? '';
      const url = /\burl=["']([^"']+)["']/i.exec(encTag)?.[1]?.replace(/&amp;/g, '&');
      const mime = /\btype=["']([^"']+)["']/i.exec(encTag)?.[1] ?? '';
      if (!url?.startsWith('https://') || (!AUDIO_MIME_RE.test(mime) && !AUDIO_EXT_RE.test(url))) {
        continue;
      }

      const title = extractTag(block, 'title');
      if (!title) continue;
      const duration = parseDurationSeconds(extractTag(block, 'itunes:duration'));
      if (duration < 45) continue;

      const epImage = /<itunes:image\b[^>]*\bhref=["']([^"']+)["']/i.exec(block)?.[1];
      const coverUrl = epImage?.startsWith('https://') ? epImage : cover;

      songs.push({
        id: `podcast-${podcast.collectionId ?? 'show'}-${idx}-${Buffer.from(url).toString('base64url').slice(-10)}`,
        title,
        artist: podcast.artistName || podcast.collectionName || 'Podcast Âm Nhạc',
        album: podcast.collectionName || 'Podcast Âm Nhạc',
        duration,
        audioUrl: url,
        coverUrl,
        category: 'Nhạc & Podcast VN',
        source: 'podcast',
        isFullTrack: true,
      });
    }
    return songs;
  } catch {
    return [];
  }
}

export async function searchMusicPodcasts(query: string, page = 1): Promise<Song[]> {
  const term = query.trim() || 'nhạc';
  const params = new URLSearchParams({
    media: 'podcast',
    country: 'VN',
    genreId: '1310',
    limit: '12',
    term,
  });

  try {
    const response = await fetch(`https://itunes.apple.com/search?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: ITunesPodcast[] };
    const shows = (data.results ?? []).filter((p) => p.feedUrl?.startsWith('https://'));
    const perPage = 4;
    const start = (Math.max(1, page) - 1) * perPage;
    const slice = shows.slice(start, start + perPage);
    if (slice.length === 0) return [];
    return (await Promise.all(slice.map((show) => parseFeedEpisodes(show, 4)))).flat();
  } catch {
    return [];
  }
}
