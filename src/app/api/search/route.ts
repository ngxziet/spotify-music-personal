import { NextRequest, NextResponse } from 'next/server';
import { CURATED_SONGS } from '@/data/mockData';
import { Song } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    return NextResponse.json({ songs: CURATED_SONGS });
  }

  const queryLower = query.toLowerCase();

  // Search in local curated songs first
  const localMatches = CURATED_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(queryLower) ||
      s.artist.toLowerCase().includes(queryLower) ||
      (s.album && s.album.toLowerCase().includes(queryLower)) ||
      (s.category && s.category.toLowerCase().includes(queryLower))
  );

  let onlineSongs: Song[] = [];

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=song&limit=30`;

    const res = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        onlineSongs = data.results
          .filter((item: any) => item.previewUrl && item.trackName)
          .map((item: any) => {
            // Get high resolution artwork
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
            } as Song;
          });
      }
    }
  } catch (error) {
    console.error('Error fetching from iTunes search API:', error);
  }

  // Combine results, prioritizing exact curated matches
  const combined = [...localMatches, ...onlineSongs];

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
