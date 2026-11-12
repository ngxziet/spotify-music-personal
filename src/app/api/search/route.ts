import { NextRequest, NextResponse } from 'next/server';
import { CURATED_SONGS } from '@/data/mockData';
import { Song } from '@/types';

function parseDurationString(str?: string): number {
  if (!str) return 210;
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function cleanSongTitle(raw?: string): { title: string; artistFromTitle?: string } {
  if (!raw) return { title: 'Bài hát' };
  let clean = raw
    .replace(/\[(OFFICIAL|Official|MV|Audio|Lyric Video|Music Video|HD|4K|Full).*?\]/gi, '')
    .replace(/\((OFFICIAL|Official|MV|Audio|Lyric Video|Music Video|HD|4K|Full).*?\)/gi, '')
    .trim();

  // If format is "Artist - Song Title"
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return {
      artistFromTitle: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }

  return { title: clean };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    const formatted = CURATED_SONGS.map((s) => ({ ...s, isFullTrack: true }));
    return NextResponse.json({ songs: formatted });
  }

  const queryLower = query.toLowerCase();

  // 1. Local curated matches (Full-length)
  const localMatches: Song[] = CURATED_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(queryLower) ||
      s.artist.toLowerCase().includes(queryLower) ||
      (s.album && s.album.toLowerCase().includes(queryLower)) ||
      (s.category && s.category.toLowerCase().includes(queryLower))
  ).map((s) => ({ ...s, isFullTrack: true }));

  let ytSongs: Song[] = [];

  // 2. Search YouTube for 100% FULL-LENGTH songs
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query + ' audio'
    )}`;

    const res = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
            ?.contents?.[0]?.itemSectionRenderer?.contents || [];

        ytSongs = contents
          .filter((item: any) => item.videoRenderer && item.videoRenderer.videoId)
          .slice(0, 18)
          .map((item: any) => {
            const v = item.videoRenderer;
            const rawTitle = v.title?.runs?.[0]?.text || '';
            const channelName = v.ownerText?.runs?.[0]?.text || 'Nghệ sĩ YouTube';
            const { title, artistFromTitle } = cleanSongTitle(rawTitle);

            const bestThumb =
              v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            const durationSecs = parseDurationString(v.lengthText?.simpleText);

            return {
              id: `yt-${v.videoId}`,
              title,
              artist: artistFromTitle || channelName,
              album: 'YouTube Full Audio',
              duration: durationSecs,
              audioUrl: '', // Streamed via YouTube Player
              coverUrl: bestThumb,
              category: 'Full Music',
              source: 'youtube',
              youtubeId: v.videoId,
              isFullTrack: true, // FULL TRACK!
            } as Song;
          });
      }
    }
  } catch (err) {
    console.warn('YouTube search failed, fallback to Audius/iTunes:', err);
  }

  // 3. Fallback: Search Audius for full songs if YouTube didn't find any
  let audiusSongs: Song[] = [];
  if (ytSongs.length === 0) {
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
        query
      )}&app_name=SoundWave`;

      const res = await fetch(audiusUrl, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          audiusSongs = json.data
            .filter((item: any) => item.is_streamable !== false && item.title)
            .slice(0, 15)
            .map((item: any) => ({
              id: `audius-${item.id}`,
              title: item.title,
              artist: item.user?.name || 'Audius Artist',
              album: item.genre || 'Single',
              duration: item.duration || 180,
              audioUrl:
                item.stream?.url ||
                `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=SoundWave`,
              coverUrl:
                item.artwork?.['480x480'] ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
              category: item.genre || 'Electronic',
              source: 'audius',
              isFullTrack: true,
            })) as Song[];
        }
      }
    } catch {}
  }

  // 4. Fallback to iTunes if both YouTube and Audius fail
  let itunesSongs: Song[] = [];
  if (ytSongs.length === 0 && audiusSongs.length === 0) {
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&entity=song&limit=15`;
      const res = await fetch(itunesUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          itunesSongs = data.results.map((item: any) => ({
            id: `itunes-${item.trackId}`,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || 'Single',
            duration: Math.round((item.trackTimeMillis || 30000) / 1000),
            audioUrl: item.previewUrl,
            coverUrl: item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
            category: item.primaryGenreName || 'Pop',
            source: 'itunes',
            isFullTrack: false,
          })) as Song[];
        }
      }
    } catch {}
  }

  // Combine: local matches first, then YouTube full songs, then Audius, then iTunes
  const combined = [...localMatches, ...ytSongs, ...audiusSongs, ...itunesSongs];

  // Remove duplicate items
  const seen = new Set<string>();
  const uniqueSongs = combined.filter((song) => {
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ songs: uniqueSongs });
}
