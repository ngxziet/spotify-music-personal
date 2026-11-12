export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  category?: string;
  lyrics?: string;
  isLocal?: boolean;
  isDownloaded?: boolean;
  downloadedAt?: string;
  source?: 'curated' | 'audius' | 'youtube' | 'itunes' | 'local';
  isFullTrack?: boolean;
  youtubeId?: string;
  playedAt?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  songs: Song[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  isAlbum?: boolean;
  artist?: string;
  releaseYear?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio?: string;
  createdAt: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioPlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  queue: Song[];
  history: Song[];
}
