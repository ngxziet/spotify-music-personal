import { Song, Playlist, UserProfile } from '@/types';
import { CURATED_PLAYLISTS } from '@/data/mockData';

const DB_NAME = 'SpotifyCloneDB';
const DB_VERSION = 1;
const STORE_OFFLINE = 'offline_songs';
const STORE_UPLOADS = 'uploaded_songs';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_OFFLINE)) {
        db.createObjectStore(STORE_OFFLINE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_UPLOADS)) {
        db.createObjectStore(STORE_UPLOADS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save song audio blob for offline listening
export async function saveSongOffline(song: Song): Promise<boolean> {
  try {
    const res = await fetch(song.audioUrl);
    const blob = await res.blob();
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE);

      const record = {
        ...song,
        isDownloaded: true,
        downloadedAt: new Date().toISOString(),
        audioBlob: blob
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save song offline:', err);
    return false;
  }
}

// Get all offline downloaded songs
export async function getOfflineSongs(): Promise<Song[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result || [];
        const songs: Song[] = records.map((r: any) => {
          const blobUrl = URL.createObjectURL(r.audioBlob);
          return {
            id: r.id,
            title: r.title,
            artist: r.artist,
            album: r.album,
            duration: r.duration,
            audioUrl: blobUrl,
            coverUrl: r.coverUrl,
            category: r.category,
            lyrics: r.lyrics,
            isDownloaded: true,
            downloadedAt: r.downloadedAt,
            source: r.source
          };
        });
        resolve(songs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get offline songs:', err);
    return [];
  }
}

// Remove an offline song from IndexedDB
export async function removeOfflineSong(songId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE);
      const req = store.delete(songId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to remove offline song:', err);
    return false;
  }
}

// Check if a song is downloaded offline
export async function isSongDownloaded(songId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_OFFLINE, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE);
      const req = store.get(songId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// Trigger direct browser download of song audio file
export async function triggerBrowserDownload(song: Song) {
  try {
    const res = await fetch(song.audioUrl);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const sanitizedTitle = `${song.artist} - ${song.title}`.replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `${sanitizedTitle}.mp3`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download failed, opening direct stream:', err);
    window.open(song.audioUrl, '_blank');
  }
}

// Save uploaded local MP3 song
export async function saveUploadedSong(song: Song, fileBlob: Blob): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_UPLOADS, 'readwrite');
      const store = tx.objectStore(STORE_UPLOADS);
      const record = {
        ...song,
        isLocal: true,
        audioBlob: fileBlob
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save uploaded song:', err);
    return false;
  }
}

// Get all uploaded songs
export async function getUploadedSongs(): Promise<Song[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_UPLOADS, 'readonly');
      const store = tx.objectStore(STORE_UPLOADS);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        const songs: Song[] = records.map((r: any) => {
          const blobUrl = URL.createObjectURL(r.audioBlob);
          return {
            id: r.id,
            title: r.title,
            artist: r.artist,
            album: r.album || 'Nhạc Tải Lên',
            duration: r.duration || 180,
            audioUrl: blobUrl,
            coverUrl: r.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
            category: 'Nhạc Của Tôi',
            isLocal: true,
            source: 'local'
          };
        });
        resolve(songs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get uploaded songs:', err);
    return [];
  }
}

// LocalStorage helpers for Playlists, Favorites, and Users
const STORAGE_PLAYLISTS = 'spotify_user_playlists';
const STORAGE_LIKED = 'spotify_liked_songs';
const STORAGE_USER = 'spotify_user_profile';
const STORAGE_USERS_LIST = 'spotify_registered_users';
const STORAGE_RECENTLY_PLAYED = 'spotify_recently_played';

export function getStoredPlaylists(): Playlist[] {
  if (typeof window === 'undefined') return CURATED_PLAYLISTS;
  try {
    const raw = localStorage.getItem(STORAGE_PLAYLISTS);
    if (!raw) {
      localStorage.setItem(STORAGE_PLAYLISTS, JSON.stringify(CURATED_PLAYLISTS));
      return CURATED_PLAYLISTS;
    }
    return JSON.parse(raw);
  } catch {
    return CURATED_PLAYLISTS;
  }
}

export function saveStoredPlaylists(playlists: Playlist[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_PLAYLISTS, JSON.stringify(playlists));
}

export function getStoredLikedSongIds(): string[] {
  if (typeof window === 'undefined') return ['song-1', 'song-3'];
  try {
    const raw = localStorage.getItem(STORAGE_LIKED);
    if (!raw) {
      const initial = ['song-1', 'song-3'];
      localStorage.setItem(STORAGE_LIKED, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return ['song-1', 'song-3'];
  }
}

export function saveStoredLikedSongIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_LIKED, JSON.stringify(ids));
}

export function getStoredRecentlyPlayed(): Song[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_RECENTLY_PLAYED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyPlayed(song: Song) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredRecentlyPlayed();
    const filtered = current.filter(s => s.id !== song.id);
    const songWithTime: Song = {
      ...song,
      playedAt: new Date().toISOString()
    };
    const updated = [songWithTime, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_RECENTLY_PLAYED, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store recently played:', err);
  }
}

export function clearStoredRecentlyPlayed() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_RECENTLY_PLAYED);
  } catch (err) {
    console.error('Failed to clear recently played:', err);
  }
}

export function removeRecentlyPlayedItem(songId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredRecentlyPlayed();
    const filtered = current.filter(s => s.id !== songId);
    localStorage.setItem(STORAGE_RECENTLY_PLAYED, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove history item:', err);
  }
}

const STORAGE_LAST_PLAYED = 'soundwave_last_played_state';

export interface StoredPlaybackState {
  song: Song;
  currentTime?: number;
}

export function getStoredLastPlayed(): StoredPlaybackState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_LAST_PLAYED);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredLastPlayed(song: Song, currentTime: number = 0) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LAST_PLAYED, JSON.stringify({ song, currentTime }));
  } catch {}
}

export const DEFAULT_USER: UserProfile = {
  id: 'user-default-1',
  name: 'Tài Khoản Cá Nhân',
  email: 'user@soundwave.io',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  bio: 'Yêu âm nhạc mỗi ngày 🎵 Lofi & V-Pop',
  createdAt: new Date().toISOString()
};

export function getStoredUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER;
  }
}

export function saveStoredUserProfile(user: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
}

export function getRegisteredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_USER];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_LIST);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_LIST, JSON.stringify([DEFAULT_USER]));
      return [DEFAULT_USER];
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_USER];
  }
}

export function saveRegisteredUsers(users: UserProfile[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_USERS_LIST, JSON.stringify(users));
}
