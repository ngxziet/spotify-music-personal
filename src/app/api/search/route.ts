import { NextRequest, NextResponse } from 'next/server';
import { CURATED_SONGS } from '@/data/mockData';
import { Song } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    const formatted = CURATED_SONGS.map(s => ({ ...s, isFullTrack: true }));
    return NextResponse.json({ songs: formatted });
  }

  const queryLower = query.toLowerCase();

  // 1. Search in local curated songs (Full-length 5-7 minutes)
  const localMatches: Song[] = CURATED_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(queryLower) ||
      s.artist.toLowerCase().includes(queryLower) ||
      (s.album && s.album.toLowerCase().includes(queryLower)) ||
      (s.category && s.category.toLowerCase().includes(queryLower))
  ).map(s => ({ ...s, isFullTrack: true }));

  // 2. Search Audius API for FREE FULL-LENGTH songs
  let audiusSongs: Song[] = [];
  try {
    const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
      query
    )}&app_name=SoundWave`;

    const res = await fetch(audiusUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000), // 4s timeout
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        audiusSongs = json.data
          .filter((item: any) => item.is_streamable !== false && item.title)
          .slice(0, 15)
          .map((item: any) => {
            const streamUrl =
              item.stream?.url ||
              `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=SoundWave`;

            const cover =
              item.artwork?.['480x480'] ||
              item.artwork?.['150x150'] ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

            return {
              id: `audius-${item.id}`,
              title: item.title,
              artist: item.user?.name || 'Nghệ sĩ SoundWave',
              album: item.genre || 'Single',
              duration: item.duration || 180, // Full length in seconds!
              audioUrl: streamUrl,
              coverUrl: cover,
              category: item.genre || 'Electronic',
              source: 'audius',
              isFullTrack: true, // FULL LENGTH SONG!
            } as Song;
          });
      }
    }
  } catch (error) {
    console.warn('Audius search error:', error);
  }

  // 3. Search iTunes API for popular tracks (30s preview)
  let itunesSongs: Song[] = [];
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=song&limit=15`;

    const res = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        itunesSongs = data.results
          .filter((item: any) => item.previewUrl && item.trackName)
          .map((item: any) => {
            const highResArt = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

            return {
              id: `itunes-${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || 'Single',
              duration: Math.round((item.trackTimeMillis || 30000) / 1000),
              audioUrl: item.previewUrl,
              coverUrl: highResArt,
              category: item.primaryGenreName || 'Pop',
              source: 'itunes',
              isFullTrack: false, // 30s preview
            } as Song;
          });
      }
    }
  } catch (error) {
    console.warn('iTunes search error:', error);
  }

  // Combine results: Local full-length tracks first, then Audius full-length tracks, then iTunes
  const combined = [...localMatches, ...audiusSongs, ...itunesSongs];

  // Remove duplicates by title + artist
  const seen = new Set<string>();
  const uniqueSongs = combined.filter((song) => {
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ songs: uniqueSongs });
}
