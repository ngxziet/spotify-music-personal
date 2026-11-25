import type { Song } from '@/types';

export function audiusStreamUrl(trackId: string) {
  return `https://api.audius.co/v1/tracks/${encodeURIComponent(trackId)}/stream?app_name=SoundWave`;
}

export function isPlayableSong(song: Song) {
  return song.source !== 'youtube' && song.source !== 'itunes' && !song.youtubeId
    && !/^(yt|itunes)-/.test(song.id) && Boolean(song.audioUrl?.trim());
}

export function songAudioUrl(song: Song) {
  // Saved Audius tracks may still have a signed URL that has expired.
  const audiusId = /^audius-([a-zA-Z0-9]+)$/.exec(song.id)?.[1];
  return song.source === 'audius' && audiusId && !song.audioUrl?.startsWith('blob:')
    ? audiusStreamUrl(audiusId)
    : song.audioUrl;
}

export function songSearchTitle(song: Song) {
  if (!song.youtubeId || !song.title.includes('|')) return song.title;
  const normalizeArtist = (text: string) => text.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\b(official|topic)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  const artist = normalizeArtist(song.artist);
  return song.title.split('|').map((part) => part.trim()).find((part) =>
    part && normalizeArtist(part) !== artist && !/^(official|audio|mv|lyric|visualizer)\b/i.test(part)
  ) ?? song.title;
}
