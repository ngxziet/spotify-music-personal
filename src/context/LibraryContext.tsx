'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Song, Playlist, UserProfile } from '@/types';
import {
  getStoredPlaylists,
  saveStoredPlaylists,
  getStoredLikedSongIds,
  saveStoredLikedSongIds,
  getStoredUserProfile,
  saveStoredUserProfile,
  getRegisteredUsers,
  saveRegisteredUsers,
  saveSongOffline,
  getOfflineSongs,
  removeOfflineSong,
  saveUploadedSong,
  getUploadedSongs,
  triggerBrowserDownload,
} from '@/utils/storage';
import { generateId } from '@/utils/format';
import confetti from 'canvas-confetti';

interface LibraryContextType {
  playlists: Playlist[];
  likedSongIds: string[];
  offlineSongs: Song[];
  uploadedSongs: Song[];
  currentUser: UserProfile;
  registeredUsers: UserProfile[];
  createPlaylist: (title: string, description: string, coverUrl?: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  updatePlaylist: (playlistId: string, data: Partial<Playlist>) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  toggleLikeSong: (song: Song) => void;
  isSongLiked: (songId: string) => boolean;
  downloadSong: (song: Song, directFileDownload?: boolean) => Promise<boolean>;
  deleteOfflineSong: (songId: string) => Promise<boolean>;
  handleUploadSong: (file: File, title: string, artist: string, album?: string) => Promise<Song | null>;
  setCurrentUser: (user: UserProfile) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  registerUser: (name: string, email: string, avatar?: string) => UserProfile;
  switchUser: (userId: string) => void;
  exportBackupData: () => string;
  importBackupData: (json: string) => boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [uploadedSongs, setUploadedSongs] = useState<Song[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => getStoredUserProfile());
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);

  // Load initial data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setPlaylists(getStoredPlaylists());
    setLikedSongIds(getStoredLikedSongIds());
    setCurrentUserState(getStoredUserProfile());
    setRegisteredUsers(getRegisteredUsers());

    // Load offline tracks from IndexedDB
    getOfflineSongs().then(songs => setOfflineSongs(songs));

    // Load user uploaded tracks from IndexedDB
    getUploadedSongs().then(songs => setUploadedSongs(songs));
  }, []);

  const createPlaylist = useCallback((title: string, description: string, coverUrl?: string): Playlist => {
    const newPlaylist: Playlist = {
      id: generateId('playlist'),
      title: title || 'Playlist Mới',
      description: description || 'Playlist tạo bởi bạn',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      songs: [],
      isCustom: true,
      createdAt: new Date().toISOString(),
      ownerId: currentUser.id
    };

    setPlaylists(prev => {
      const updated = [newPlaylist, ...prev];
      saveStoredPlaylists(updated);
      return updated;
    });

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {}

    return newPlaylist;
  }, [currentUser]);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== playlistId);
      saveStoredPlaylists(updated);
      return updated;
    });
  }, []);

  const updatePlaylist = useCallback((playlistId: string, data: Partial<Playlist>) => {
    setPlaylists(prev => {
      const updated = prev.map(p => (p.id === playlistId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
      saveStoredPlaylists(updated);
      return updated;
    });
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, song: Song) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          if (p.songs.some(s => s.id === song.id)) return p;
          return {
            ...p,
            songs: [...p.songs, song],
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      saveStoredPlaylists(updated);
      return updated;
    });
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            songs: p.songs.filter(s => s.id !== songId),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      saveStoredPlaylists(updated);
      return updated;
    });
  }, []);

  const isSongLiked = useCallback((songId: string) => {
    return likedSongIds.includes(songId);
  }, [likedSongIds]);

  const toggleLikeSong = useCallback((song: Song) => {
    setLikedSongIds(prev => {
      const isAlready = prev.includes(song.id);
      let updated: string[];
      if (isAlready) {
        updated = prev.filter(id => id !== song.id);
      } else {
        updated = [song.id, ...prev];
        try {
          confetti({ particleCount: 30, spread: 45, origin: { y: 0.85 } });
        } catch {}
      }
      saveStoredLikedSongIds(updated);
      return updated;
    });
  }, []);

  const downloadSong = useCallback(async (song: Song, directFileDownload: boolean = false): Promise<boolean> => {
    if (directFileDownload) {
      await triggerBrowserDownload(song);
    }
    const success = await saveSongOffline(song);
    if (success) {
      const updated = await getOfflineSongs();
      setOfflineSongs(updated);
    }
    return success;
  }, []);

  const deleteOfflineSong = useCallback(async (songId: string): Promise<boolean> => {
    const success = await removeOfflineSong(songId);
    if (success) {
      setOfflineSongs(prev => prev.filter(s => s.id !== songId));
    }
    return success;
  }, []);

  const handleUploadSong = useCallback(async (file: File, title: string, artist: string, album?: string): Promise<Song | null> => {
    try {
      const id = generateId('local-song');
      const song: Song = {
        id,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        artist: artist || 'Nghệ sĩ chưa rõ',
        album: album || 'Nhạc Đã Tải Lên',
        duration: 210,
        audioUrl: '', // Will be assigned from blob
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        category: 'Nhạc Của Tôi',
        isLocal: true,
        source: 'local'
      };

      await saveUploadedSong(song, file);
      const updatedList = await getUploadedSongs();
      setUploadedSongs(updatedList);
      return song;
    } catch (err) {
      console.error('Failed to upload song:', err);
      return null;
    }
  }, []);

  const setCurrentUser = useCallback((user: UserProfile) => {
    setCurrentUserState(user);
    saveStoredUserProfile(user);
  }, []);

  const updateUserProfile = useCallback((data: Partial<UserProfile>) => {
    setCurrentUserState(prev => {
      const updated = { ...prev, ...data };
      saveStoredUserProfile(updated);
      setRegisteredUsers(list => {
        const uList = list.map(u => (u.id === updated.id ? updated : u));
        saveRegisteredUsers(uList);
        return uList;
      });
      return updated;
    });
  }, []);

  const registerUser = useCallback((name: string, email: string, avatar?: string): UserProfile => {
    const newUser: UserProfile = {
      id: generateId('user'),
      name: name || 'Người dùng mới',
      email: email || `${Date.now()}@soundwave.local`,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      bio: 'Người yêu âm nhạc 🎶',
      createdAt: new Date().toISOString()
    };

    setRegisteredUsers(prev => {
      const updated = [...prev, newUser];
      saveRegisteredUsers(updated);
      return updated;
    });

    setCurrentUser(newUser);
    return newUser;
  }, [setCurrentUser]);

  const switchUser = useCallback((userId: string) => {
    const found = registeredUsers.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  }, [registeredUsers, setCurrentUser]);

  const exportBackupData = useCallback((): string => {
    const data = {
      user: currentUser,
      playlists,
      likedSongIds,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  }, [currentUser, playlists, likedSongIds]);

  const importBackupData = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.playlists && Array.isArray(data.playlists)) {
        setPlaylists(data.playlists);
        saveStoredPlaylists(data.playlists);
      }
      if (data.likedSongIds && Array.isArray(data.likedSongIds)) {
        setLikedSongIds(data.likedSongIds);
        saveStoredLikedSongIds(data.likedSongIds);
      }
      if (data.user) {
        setCurrentUser(data.user);
      }
      return true;
    } catch (err) {
      console.error('Failed to import backup data:', err);
      return false;
    }
  }, [setCurrentUser]);

  return (
    <LibraryContext.Provider
      value={{
        playlists,
        likedSongIds,
        offlineSongs,
        uploadedSongs,
        currentUser,
        registeredUsers,
        createPlaylist,
        deletePlaylist,
        updatePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleLikeSong,
        isSongLiked,
        downloadSong,
        deleteOfflineSong,
        handleUploadSong,
        setCurrentUser,
        updateUserProfile,
        registerUser,
        switchUser,
        exportBackupData,
        importBackupData
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
