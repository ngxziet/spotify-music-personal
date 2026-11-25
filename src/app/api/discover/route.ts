import { NextResponse } from 'next/server';
import { getAudiusTrendingPlaylists, searchAudius } from '../search/audius';
import { searchArchive } from '../search/archive';
import { searchOpenverse } from '../search/openverse';
import { searchRadioStations } from '../search/radio';
import type { Song } from '@/types';

function interleave(groups: Song[][]): Song[] {
  const out: Song[] = [];
  const max = groups.reduce((m, g) => Math.max(m, g.length), 0);
  for (let i = 0; i < max; i += 1) {
    for (const g of groups) {
      if (i < g.length) out.push(g[i]);
    }
  }
  return out;
}

export async function GET() {
  const [audiusTrending, openverseTracks, fmaTracks, playlists, radio] = await Promise.all([
    searchAudius('', { limit: 20, page: 1 }),
    searchOpenverse('chill', 1),
    searchArchive('music', 'freemusicarchive', 1),
    getAudiusTrendingPlaylists(8),
    searchRadioStations('', 1),
  ]);

  const seen = new Set<string>();
  const trending = interleave([
    audiusTrending ?? [],
    openverseTracks.slice(0, 10),
    fmaTracks.slice(0, 8),
  ]).filter((song) => {
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 24);

  return NextResponse.json({
    trending,
    playlists: playlists.slice(0, 8),
    radio: radio.slice(0, 8),
  });
}
