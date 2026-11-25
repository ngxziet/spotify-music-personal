import type { Song } from '@/types';
import { isPlayableSong, songAudioUrl } from './audioSource';
import { getCachedOfflineUrl, getOfflineBlobUrl, getUploadedSongs } from '@/utils/storage';

interface AndroidTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork: string;
  url?: string;
  cacheKey?: string;
}

interface AndroidPlaybackState {
  type: 'state';
  id: string;
  playing: boolean;
  position: number;
  duration: number;
  error: boolean;
  request: number;
}

export type AndroidPlaybackEvent = AndroidPlaybackState | {
  type: 'error';
  id: string;
  message: string;
};

declare global {
  interface Window {
    SoundWaveAndroid?: {
      postMessage: (message: string) => void;
      onmessage: ((event: MessageEvent<string>) => void) | null;
    };
  }
}

type Command =
  | { action: 'sync' | 'pause' | 'resume' | 'stop' | 'next' | 'previous' }
  | { action: 'play'; song: AndroidTrack; queue: AndroidTrack[]; position: number; autoplay: boolean; request: number }
  | { action: 'queue'; currentId: string; queue: AndroidTrack[] }
  | { action: 'seek'; position: number }
  | { action: 'volume' | 'rate'; value: number }
  | { action: 'shuffle'; enabled: boolean }
  | { action: 'repeat'; mode: string }
  | { action: 'file'; key: string; data: string; first: boolean; last: boolean };

export function androidBridge() {
  return typeof window === 'undefined' ? undefined : window.SoundWaveAndroid;
}

export function sendAndroidPlayback(command: Command) {
  androidBridge()?.postMessage(JSON.stringify(command));
}

const transferredFiles = new Map<string, Promise<string>>();

async function transferAudioFile(url: string) {
  const blob = await fetch(url).then((response) => response.blob());
  if (blob.size === 0) throw new Error('No audio data');

  const key = crypto.randomUUID();
  const chunkSize = 32 * 1024;
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const buffer = new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
    const data = btoa(String.fromCharCode(...buffer));
    sendAndroidPlayback({
      action: 'file',
      key,
      data,
      first: offset === 0,
      last: offset + chunkSize >= blob.size,
    });
  }
  return key;
}

export function directAndroidTrack(song: Song): AndroidTrack | undefined {
  if (!isPlayableSong(song)) return;
  const url = songAudioUrl(song);
  if (!url.startsWith('https://')) return;
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.coverUrl,
    url,
  };
}

export async function prepareAndroidTrack(song: Song): Promise<AndroidTrack | undefined> {
  if (!isPlayableSong(song)) return;
  let url = getCachedOfflineUrl(song.id);
  if (!url && (song.isDownloaded || song.audioUrl?.startsWith('blob:'))) {
    url = await getOfflineBlobUrl(song.id) || undefined;
  }
  if (!url && song.audioUrl?.startsWith('blob:')) {
    if (song.isLocal || song.source === 'local') {
      url = (await getUploadedSongs()).find(({ id }) => id === song.id)?.audioUrl;
    }
    url ||= song.audioUrl;
  }
  if (!url) return directAndroidTrack(song);

  let transfer = transferredFiles.get(url);
  if (!transfer) {
    transfer = transferAudioFile(url);
    transferredFiles.set(url, transfer);
  }
  try {
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.coverUrl,
      cacheKey: await transfer,
    };
  } catch {
    transferredFiles.delete(url);
    return directAndroidTrack(song);
  }
}
