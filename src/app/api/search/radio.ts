import type { Song } from '@/types';

const FALLBACK_ARTWORK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
const RADIO_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];
const SUPPORTED_CODECS = new Set(['MP3', 'AAC', 'AAC+', 'OGG', 'OPUS', 'FLAC']);

type RadioStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  codec?: string;
  bitrate?: number;
  lastcheckok?: number;
};

async function fetchStations(path: string, params: URLSearchParams): Promise<RadioStation[]> {
  for (const host of RADIO_HOSTS) {
    try {
      const response = await fetch(`${host}/json/stations/${path}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SoundWaveMusicApp/1.0',
        },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as RadioStation[];
      if (Array.isArray(data)) return data;
    } catch {
      // Try next Radio Browser mirror
    }
  }
  return [];
}

function pickStationStreamUrl(station: RadioStation): string | undefined {
  const baseUrl = station.url?.trim();
  const resolved = station.url_resolved?.trim();
  // Prefer clean non-expiring HTTPS URL over cached tokenized redirect URLs (e.g. zeno.fm ?zt=...)
  if (resolved?.includes('?zt=') && baseUrl?.startsWith('https://')) {
    return baseUrl;
  }
  if (resolved?.startsWith('https://')) return resolved;
  if (baseUrl?.startsWith('https://')) return baseUrl;
  return undefined;
}

export async function searchRadioStations(query: string, page = 1): Promise<Song[]> {
  const limit = 20;
  const offset = (Math.max(1, page) - 1) * limit;
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const isVietnamQuery = /^(v-?pop|vietnam|viet|việt|nhạc việt|nhac viet)$/i.test(lower);

  let stations: RadioStation[] = [];

  if (isVietnamQuery) {
    const vnCountry = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
      countrycode: 'VN',
    });
    const vnLang = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
      language: 'vietnamese',
    });
    const [byCountry, byLang] = await Promise.all([
      fetchStations('search', vnCountry),
      fetchStations('search', vnLang),
    ]);
    stations = [...byCountry, ...byLang];
    // Rank music/pop/dj stations ahead of talk/news stations
    stations.sort((a, b) => {
      const musicScore = (s: RadioStation) =>
        /(music|pop|dj|dance|80s|90s|rock|chill|lofi)/i.test(`${s.name ?? ''} ${s.tags ?? ''}`) ? 1 : 0;
      return musicScore(b) - musicScore(a);
    });
  } else {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
    });
    if (!trimmed) {
      params.set('tag', 'music');
    } else {
      params.set('tagList', lower);
    }
    stations = await fetchStations('search', params);

    if (trimmed && stations.length < 5) {
      const nameParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        hidebroken: 'true',
        order: 'clickcount',
        reverse: 'true',
        name: trimmed,
      });
      const byName = await fetchStations('search', nameParams);
      stations = [...stations, ...byName];
    }
  }

  const seen = new Set<string>();
  return stations.flatMap((station): Song[] => {
    const url = pickStationStreamUrl(station);
    const codec = (station.codec ?? '').toUpperCase();
    if (
      !station.stationuuid ||
      !station.name ||
      !url ||
      url.toLowerCase().includes('.m3u8') ||
      url.toLowerCase().includes('.pls') ||
      station.lastcheckok !== 1 ||
      !SUPPORTED_CODECS.has(codec) ||
      seen.has(station.stationuuid)
    ) {
      return [];
    }
    seen.add(station.stationuuid);

    const details = [station.country, codec, station.bitrate ? `${station.bitrate}kbps` : '']
      .filter(Boolean)
      .join(' · ');

    return [{
      id: `radio-${station.stationuuid}`,
      title: station.name.trim(),
      artist: details || 'Radio Trực Tiếp 24/7',
      album: station.tags ? station.tags.split(',').slice(0, 3).join(' · ') : 'Live Radio',
      duration: 0,
      audioUrl: url,
      coverUrl: station.favicon?.startsWith('https://') ? station.favicon : FALLBACK_ARTWORK,
      category: 'Radio 24/7',
      source: 'radio',
      isFullTrack: true,
      isLive: true,
    }];
  });
}
