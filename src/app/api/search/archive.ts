import type { Song } from '@/types';

type ArchiveHit = { identifier: string; licenseurl: string };
type ArchiveItem = {
  is_dark?: boolean;
  metadata?: { title?: string; creator?: string | string[]; licenseurl?: string; 'access-restricted-item'?: string | boolean };
  files?: {
    name?: string;
    title?: string;
    artist?: string;
    format?: string;
    length?: string;
    private?: string | boolean;
  }[];
};

function openLicense(value: string) {
  const path = /^https?:\/\/creativecommons\.org\/(licenses\/(?:by|by-sa)|publicdomain\/(?:zero|mark))\/([\d.]+)\/?$/i.exec(value);
  if (!path) return;
  const label = path[1].split('/')[1];
  return {
    licenseUrl: `https://creativecommons.org/${path[1]}/${path[2]}/`,
    licenseName: label === 'zero' ? 'CC0' : label === 'mark' ? 'Public Domain Mark' : `CC ${label.toUpperCase()}`,
  };
}

async function getArchiveItem(id: string, signal: AbortSignal): Promise<Song[]> {
  try {
    const response = await fetch(`https://archive.org/metadata/${id}`, { next: { revalidate: 3600 }, signal });
    if (!response.ok) return [];
    const item = await response.json() as ArchiveItem;
    const restricted = item.metadata?.['access-restricted-item'];
    if (item.is_dark || restricted === 'true' || restricted === true) return [];
    const license = openLicense(item.metadata?.licenseurl ?? '');
    if (!license || !Array.isArray(item.files)) return [];
    const creator = item.metadata?.creator;
    const artist = Array.isArray(creator) ? creator.join(', ') : creator;

    return item.files.flatMap((file): Song[] => {
      const duration = Math.round(Number(file.length));
      if (!file.name || !file.format?.includes('MP3') || !Number.isFinite(duration) || duration < 45
        || file.private === true || file.private === 'true') return [];

      const filename = file.name.split('/').map(encodeURIComponent).join('/');
      return [{
        id: `archive-${id}-${filename}`,
        title: file.title || file.name.replace(/\.mp3$/i, ''),
        artist: file.artist || artist || 'Nghệ sĩ chưa rõ',
        album: item.metadata?.title || 'Netlabels',
        duration,
        audioUrl: `https://archive.org/download/${id}/${filename}`,
        coverUrl: `https://archive.org/services/img/${id}`,
        source: 'archive',
        isFullTrack: true,
        attribution: { ...license, sourceUrl: `https://archive.org/details/${id}` },
      }];
    }).slice(0, 3);
  } catch {
    return [];
  }
}

export async function searchArchive(query: string): Promise<Song[]> {
  // Search only Netlabels. Verify the item license again before returning audio URLs.
  const term = query.replace(/[\\"]/g, '\\$&');
  const params = new URLSearchParams({
    q: `collection:netlabels AND mediatype:audio AND licenseurl:* AND (title:"${term}" OR creator:"${term}")`,
    rows: '12',
    output: 'json',
  });
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'licenseurl');
  const signal = AbortSignal.timeout(3500);
  try {
    const response = await fetch(`https://archive.org/advancedsearch.php?${params}`, {
      next: { revalidate: 3600 },
      signal,
    });
    if (!response.ok) return [];
    const data = await response.json() as { response?: { docs?: ArchiveHit[] } };
    const hits = data.response?.docs;
    if (!Array.isArray(hits)) return [];
    const items = hits.filter((hit) => /^[a-zA-Z0-9_.-]+$/.test(hit.identifier) && openLicense(hit.licenseurl))
      .slice(0, 3);
    return (await Promise.all(items.map(({ identifier }) => getArchiveItem(identifier, signal)))).flat();
  } catch {
    return [];
  }
}
