import { NextRequest, NextResponse } from 'next/server';
import { CURATED_SONGS } from '@/data/mockData';
import type { Song } from '@/types';
import { searchArchive } from './archive';
import { searchAudius, searchAudiusMulti } from './audius';
import { searchDogmazic } from './dogmazic';
import { searchOpenverse } from './openverse';
import { searchMusicPodcasts } from './podcasts';
import { searchRadioStations } from './radio';
import { searchWikimedia } from './wikimedia';

const GENRE_QUERY_MAP: Record<string, string> = {
  pop: 'pop',
  lofi: 'lofi',
  edm: 'electronic',
  piano: 'piano',
  acoustic: 'acoustic',
  vpop: 'vpop',
  rock: 'rock',
  jazz: 'jazz',
  hiphop: 'hip hop',
  ambient: 'ambient',
};

const VPOP_AUDIUS_QUERIES = ['vpop', 'vinahouse', 'nhac viet', 'nhac hoa'];

function interleaveGroups(groups: Song[][]): Song[] {
  const result: Song[] = [];
  const maxLen = groups.reduce((max, g) => Math.max(max, g.length), 0);
  for (let i = 0; i < maxLen; i += 1) {
    for (const group of groups) {
      if (i < group.length) result.push(group[i]);
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const query = sp.get('q')?.trim().slice(0, 200) ?? '';
  const genre = sp.get('genre')?.trim().toLowerCase() ?? 'all';
  const source = sp.get('source')?.trim().toLowerCase() ?? 'all';
  const page = Math.min(10, Math.max(1, Number(sp.get('page')) || 1));

  const genreKeyword = genre !== 'all' && genre !== 'radio' ? (GENRE_QUERY_MAP[genre] ?? genre) : '';
  const effectiveQuery = query || genreKeyword;
  const term = effectiveQuery.toLowerCase();

  const curated =
    page === 1 && (source === 'all' || source === 'curated') && genre !== 'radio'
      ? CURATED_SONGS.filter((song) =>
          !term || [song.title, song.artist, song.album, song.category].some((text) =>
            text?.toLowerCase().includes(term)
          )
        ).map((song) => ({ ...song, isFullTrack: true }))
      : [];

  if (source === 'radio' || genre === 'radio') {
    const radioTracks = await searchRadioStations(query || genreKeyword, page);
    return NextResponse.json({
      songs: radioTracks,
      page,
      hasMore: radioTracks.length >= 15,
      catalogUnavailable: false,
    });
  }

  if (source === 'podcast') {
    const podcastTracks = await searchMusicPodcasts(query || (genre === 'vpop' ? 'nhạc' : genreKeyword || 'nhạc'), page);
    return NextResponse.json({
      songs: podcastTracks,
      page,
      hasMore: podcastTracks.length >= 8,
      catalogUnavailable: false,
    });
  }

  // Dedicated Vietnamese V-Pop blend when browsing the V-Pop genre without typing a custom search
  if (genre === 'vpop' && !query && source === 'all') {
    const [audiusVpop, vnPodcasts, vnRadio] = await Promise.all([
      searchAudiusMulti(VPOP_AUDIUS_QUERIES, { page, limitPerQuery: 12 }),
      searchMusicPodcasts('nhạc', page),
      page === 1 ? searchRadioStations('vpop', 1) : Promise.resolve([]),
    ]);
    const songs = [
      ...interleaveGroups([audiusVpop, vnPodcasts]),
      ...vnRadio.slice(0, 6),
    ];
    const seenIds = new Set<string>();
    const unique = songs.filter((s) => (seenIds.has(s.id) ? false : (seenIds.add(s.id), true)));
    return NextResponse.json({
      songs: unique,
      page,
      hasMore: page < 10 && (audiusVpop.length >= 15 || vnPodcasts.length >= 8),
      catalogUnavailable: unique.length === 0,
    });
  }

  const shouldQuery = (target: string) => source === 'all' || source === target;
  const archiveQuery = effectiveQuery || 'music';

  const [
    audiusTracks,
    openTracks,
    netlabelTracks,
    fmaTracks,
    archiveOpenTracks,
    wikimediaTracks,
    dogmazicTracks,
    podcastTracks,
    radioTracks,
  ] = await Promise.all([
    shouldQuery('audius')
      ? searchAudius(query, { genre: genre !== 'all' ? genre : undefined, page, limit: 35 })
      : Promise.resolve([]),
    shouldQuery('openverse')
      ? searchOpenverse(effectiveQuery || 'music', page)
      : Promise.resolve([]),
    shouldQuery('archive')
      ? searchArchive(archiveQuery, 'netlabels', page)
      : Promise.resolve([]),
    shouldQuery('archive')
      ? searchArchive(archiveQuery, 'freemusicarchive', page)
      : Promise.resolve([]),
    shouldQuery('archive') && (Boolean(effectiveQuery) || page > 1)
      ? searchArchive(archiveQuery, 'open', page)
      : Promise.resolve([]),
    shouldQuery('wikimedia') && Boolean(effectiveQuery)
      ? searchWikimedia(effectiveQuery, page)
      : Promise.resolve([]),
    shouldQuery('dogmazic') && Boolean(effectiveQuery)
      ? searchDogmazic(effectiveQuery, page)
      : Promise.resolve([]),
    source === 'all' && Boolean(effectiveQuery)
      ? searchMusicPodcasts(effectiveQuery, page)
      : Promise.resolve([]),
    source === 'all' && Boolean(effectiveQuery) && page === 1
      ? searchRadioStations(effectiveQuery, 1).then((tracks) => tracks.slice(0, 4))
      : Promise.resolve([]),
  ]);

  const audiusList = audiusTracks ?? [];
  const merged =
    source === 'all'
      ? [
          ...(query ? curated : []),
          ...audiusList.slice(0, 5),
          ...interleaveGroups([
            audiusList.slice(5),
            podcastTracks,
            openTracks,
            fmaTracks,
            netlabelTracks,
            archiveOpenTracks,
            wikimediaTracks,
            dogmazicTracks,
          ]),
          ...(!query ? curated : []),
          ...radioTracks,
        ]
      : [
          ...curated,
          ...audiusList,
          ...podcastTracks,
          ...openTracks,
          ...fmaTracks,
          ...netlabelTracks,
          ...archiveOpenTracks,
          ...wikimediaTracks,
          ...dogmazicTracks,
          ...radioTracks,
        ];

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const unique = merged.filter((song) => {
    if (seenIds.has(song.id)) return false;
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seenKeys.has(key)) return false;
    seenIds.add(song.id);
    seenKeys.add(key);
    return true;
  });

  const hasMore =
    page < 10 &&
    (audiusList.length >= 25 ||
      openTracks.length >= 15 ||
      podcastTracks.length >= 8 ||
      fmaTracks.length >= 6 ||
      netlabelTracks.length >= 6 ||
      archiveOpenTracks.length >= 6 ||
      wikimediaTracks.length >= 10 ||
      dogmazicTracks.length >= 10);

  const catalogUnavailable =
    audiusTracks === null &&
    ![
      openTracks,
      podcastTracks,
      netlabelTracks,
      fmaTracks,
      archiveOpenTracks,
      wikimediaTracks,
      dogmazicTracks,
      radioTracks,
    ].some((tracks) => tracks.length > 0);

  return NextResponse.json({
    songs: unique,
    page,
    hasMore,
    catalogUnavailable,
  });
}
