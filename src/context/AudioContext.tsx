'use client';

import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Song, RepeatMode } from '@/types';
import {
  addRecentlyPlayed,
  getStoredRecentlyPlayed,
  clearStoredRecentlyPlayed,
  removeRecentlyPlayedItem,
  getStoredLastPlayed,
  saveStoredLastPlayed,
  getStoredQueue,
  saveStoredQueue,
  getCachedOfflineUrl,
  getOfflineBlobUrl,
} from '@/utils/storage';
import { CURATED_SONGS } from '@/data/mockData';
import {
  androidBridge,
  directAndroidTrack,
  prepareAndroidTrack,
  sendAndroidPlayback,
  type AndroidPlaybackEvent,
} from '@/utils/androidPlayback';
import { usePwa } from '@/context/PwaContext';
import { isPlayableSong, songAudioUrl, songSearchTitle } from '@/utils/audioSource';
import { createAudioPosition } from './audioPosition';

const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const initialAudioPosition = () => 0;
const skipPositionSubscription = () => () => {};

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  queue: Song[];
  history: Song[];
  isNowPlayingOpen: boolean;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  playSong: (song: Song, newQueue?: Song[]) => void;
  playCollection: (songs: Song[]) => void;
  togglePlay: () => void;
  pauseSong: () => void;
  resumeSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  clearHistory: () => void;
  removeFromHistory: (songId: string) => void;
  setPlaybackRate: (rate: number) => void;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsLyricsOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);
const AudioPositionContext = createContext<ReturnType<typeof createAudioPosition> | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userWantsPlayingRef = useRef<boolean>(false);
  const nativeActiveRef = useRef(false);
  const nativePendingIdRef = useRef('');
  const nativeRequestRef = useRef(0);
  const nativeQueueRevisionRef = useRef(0);
  const nativeSongsRef = useRef(new Map<string, Song>());
  const nativeErrorRef = useRef('');
  const { showToast } = usePwa();
  const router = useRouter();
  const lastSavedAtRef = useRef(0);

  const [position] = useState(createAudioPosition);
  const [currentSong, setCurrentSong] = useState<Song | null>(() => CURATED_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(() => CURATED_SONGS[0].duration);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [queue, setQueue] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);

  // Modals state
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  // Live state refs to guarantee accurate data in beforeunload and timers
  const currentSongRef = useRef<Song | null>(currentSong);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const queueRef = useRef<Song[]>(queue);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const persistProgress = useCallback((force = false, playing = isPlayingRef.current) => {
    const now = performance.now();
    const song = currentSongRef.current;
    if (!song || (!force && now - lastSavedAtRef.current < PROGRESS_SAVE_INTERVAL_MS)) return;
    lastSavedAtRef.current = now;
    saveStoredLastPlayed(song, position.read(), playing);
  }, [position]);

  useEffect(() => {
    const saveSession = () => {
      persistProgress(true);
      if (queueRef.current.length > 0) {
        saveStoredQueue(queueRef.current);
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        saveSession();
      } else {
        position.update(position.read(), true);
      }
    };

    window.addEventListener('pagehide', saveSession);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', saveSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [persistProgress, position]);

  // Initialize HTML5 Audio element
  useEffect(() => {
    const savedVol = localStorage.getItem('spotify_volume');
    const volNum = savedVol ? Number(savedVol) : 0.8;
    const initialVolume = Number.isFinite(volNum) && volNum >= 0 && volNum <= 1 ? volNum : 0.8;
    queueMicrotask(() => setVolumeState(initialVolume));
    if (androidBridge()) return;

    const audio = new Audio();
    audio.preload = 'none';
    audio.src = CURATED_SONGS[0].audioUrl;
    audio.volume = initialVolume;
    audioRef.current = audio;

    const isHtmlPlayback = () => !nativeActiveRef.current;

    const onPlay = () => {
      if (isHtmlPlayback()) setIsPlaying(true);
    };
    const onPause = () => {
      if (!isHtmlPlayback() || !audio.paused) return;
      position.update(audio.currentTime, true);
      setIsPlaying(false);
      persistProgress(true, false);
    };
    const onTimeUpdate = () => {
      if (!isHtmlPlayback()) return;
      position.update(audio.currentTime);
      if (!audio.paused) persistProgress(false, true);
    };
    const onLoadedMetadata = () => {
      if (isHtmlPlayback()) setDuration(audio.duration || 0);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.pause();
      audioRef.current = null;
    };
  }, [persistProgress, position]);

  // Restore listening history, queue and last played song from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedHistory = getStoredRecentlyPlayed();
    const storedQueue = getStoredQueue().filter(isPlayableSong);
    const storedLastPlayed = getStoredLastPlayed();
    const lastPlayed = storedLastPlayed && isPlayableSong(storedLastPlayed.song) ? storedLastPlayed : null;
    queueRef.current = storedQueue;
    queueMicrotask(() => {
      if (storedHistory.length > 0) setHistory(storedHistory);
      if (storedQueue.length > 0) setQueue(storedQueue);
      if (!lastPlayed?.song) return;
      setCurrentSong(lastPlayed.song);
      setDuration(lastPlayed.song.duration || lastPlayed.duration || 210);
      position.update(lastPlayed.currentTime || 0, true);
    });
    if (lastPlayed?.song) {
      currentSongRef.current = lastPlayed.song;
      const savedTime = lastPlayed.currentTime || 0;
      lastSavedAtRef.current = performance.now();

      if (audioRef.current) {
        if (lastPlayed.song.audioUrl.startsWith('blob:')) {
          getOfflineBlobUrl(lastPlayed.song.id).then((freshUrl) => {
            if (freshUrl && audioRef.current && currentSongRef.current?.id === lastPlayed.song.id) {
              audioRef.current.src = freshUrl;
              audioRef.current.currentTime = savedTime;
            }
          });
        } else {
          audioRef.current.src = songAudioUrl(lastPlayed.song);
          audioRef.current.currentTime = savedTime;
        }
      }
    }
  }, [position]);

  const onMediaPlay = useEffectEvent(() => {
    if (!isPlayingRef.current) togglePlay();
  });
  const onMediaPause = useEffectEvent(() => pauseSong());
  const onMediaNext = useEffectEvent(() => playNext());
  const onMediaPrevious = useEffectEvent(() => playPrevious());
  const onMediaSeek = useEffectEvent((time: number) => seekTo(time));

  useEffect(() => {
    if (!currentSong || androidBridge() || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'SoundWave Music App',
      artwork: [
        { src: currentSong.coverUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: currentSong.coverUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: currentSong.coverUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => onMediaPlay());
    navigator.mediaSession.setActionHandler('pause', () => onMediaPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => onMediaPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => onMediaNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) onMediaSeek(details.seekTime);
    });
  }, [currentSong]);

  // Play next song
  function playNext() {
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'next' });
      return;
    }
    if (queue.length > 0) {
      let nextIndex = 0;
      if (isShuffle && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const nextSong = queue[nextIndex];
      const remainingQueue = queue.filter((_, idx) => idx !== nextIndex);
      updateQueue(remainingQueue);
      playSongInternal(nextSong);
    } else if (repeatMode === 'all' && currentSong) {
      const songs = history.filter((song) => song.id !== currentSong.id && isPlayableSong(song)).reverse();
      songs.push(currentSong);
      updateQueue(songs.slice(1));
      playSongInternal(songs[0]);
    } else {
      setIsPlaying(false);
    }
  }

  // Play previous song
  function playPrevious() {
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'previous' });
      return;
    }
    if (position.read() > 3) {
      seekTo(0);
      return;
    }

    const prevSong = history.find((song) => song.id !== currentSong?.id && isPlayableSong(song));
    if (prevSong) {
      if (currentSong) updateQueue([currentSong, ...queueRef.current]);
      playSongInternal(prevSong);
    } else {
      seekTo(0);
    }
  }

  // Handle HTML5 track ended
  const onAudioEnded = useEffectEvent((audio: HTMLAudioElement) => {
    if (nativeActiveRef.current) return;
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    } else {
      playNext();
    }
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => onAudioEnded(audio);

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const onNativeEvent = useEffectEvent((event: AndroidPlaybackEvent) => {
    if (event.type === 'error') {
      if (nativePendingIdRef.current && (!event.id || event.id === nativePendingIdRef.current)) {
        nativePendingIdRef.current = '';
        nativeActiveRef.current = false;
        userWantsPlayingRef.current = false;
        setIsPlaying(false);
        showToast(event.message, 'warning');
      }
      return;
    }
    if (!event.id) return;
    if (nativePendingIdRef.current && (nativePendingIdRef.current !== event.id
        || nativeRequestRef.current !== event.request)) return;

    const previousSong = currentSongRef.current;
    const song = nativeSongsRef.current.get(event.id)
      ?? (previousSong?.id === event.id ? previousSong : undefined)
      ?? queueRef.current.find((item) => item.id === event.id)
      ?? getStoredRecentlyPlayed().find((item) => item.id === event.id);
    if (!song || !isPlayableSong(song)) return;
    nativeSongsRef.current.set(event.id, song);
    nativePendingIdRef.current = '';
    nativeActiveRef.current = true;
    userWantsPlayingRef.current = event.playing;
    const songChanged = previousSong?.id !== song.id;
    if (songChanged) {
      const nextSong = { ...song, playedAt: new Date().toISOString() };
      currentSongRef.current = nextSong;
      setCurrentSong(nextSong);
      addRecentlyPlayed(nextSong);
      setHistory((previous) => [nextSong, ...previous.filter(({ id }) => id !== song.id)].slice(0, 50));
      queueRef.current = queueRef.current.filter(({ id }) => id !== song.id);
      setQueue(queueRef.current);
      saveStoredQueue(queueRef.current);
    }
    const playingChanged = event.playing !== isPlayingRef.current;
    position.update(event.position, songChanged || playingChanged);
    const currentDuration = event.duration || song.duration;
    if (currentDuration !== duration) setDuration(currentDuration);
    if (songChanged || playingChanged || event.playing) {
      persistProgress(songChanged || playingChanged, event.playing);
    }
    if (playingChanged) {
      isPlayingRef.current = event.playing;
      setIsPlaying(event.playing);
    }
    if (event.error && nativeErrorRef.current !== event.id) {
      nativeErrorRef.current = event.id;
      showToast('Không mở được bài này. Bạn có thể thử lại hoặc chọn bài khác.', 'warning');
    }
  });

  useEffect(() => {
    const bridge = androidBridge();
    if (!bridge) return;
    bridge.onmessage = (message) => onNativeEvent(JSON.parse(message.data) as AndroidPlaybackEvent);
    sendAndroidPlayback({ action: 'sync' });
    return () => { bridge.onmessage = null; };
  }, []);

  const refreshNativeQueue = (songId: string, songs: Song[]) => {
    const revision = ++nativeQueueRevisionRef.current;
    void Promise.all(songs.map(prepareAndroidTrack)).then((tracks) => {
      if (revision !== nativeQueueRevisionRef.current || !nativeActiveRef.current
          || currentSongRef.current?.id !== songId) return;
      for (const song of songs) nativeSongsRef.current.set(song.id, song);
      sendAndroidPlayback({ action: 'queue', currentId: songId, queue: tracks.filter((track) => track !== undefined) });
    });
  };

  const startNativeSong = async (song: Song, position: number) => {
    const request = ++nativeRequestRef.current;
    nativePendingIdRef.current = song.id;
    nativeErrorRef.current = '';
    nativeActiveRef.current = true;
    userWantsPlayingRef.current = true;
    audioRef.current?.pause();
    sendAndroidPlayback({ action: 'pause' });
    setIsPlaying(true);
    const track = await prepareAndroidTrack(song);
    if (nativeRequestRef.current !== request) return;
    if (!track) {
      nativePendingIdRef.current = '';
      nativeActiveRef.current = false;
      userWantsPlayingRef.current = false;
      setIsPlaying(false);
      showToast('Không tìm thấy tệp âm thanh để phát.', 'warning');
      return;
    }

    const upcoming = queueRef.current.filter(({ id }) => id !== song.id);
    for (const item of [song, ...upcoming]) nativeSongsRef.current.set(item.id, item);
    const queue = upcoming.flatMap((item) => directAndroidTrack(item) ?? []);
    sendAndroidPlayback({ action: 'rate', value: playbackRate });
    sendAndroidPlayback({ action: 'volume', value: isMuted ? 0 : volume });
    sendAndroidPlayback({ action: 'shuffle', enabled: isShuffle });
    sendAndroidPlayback({ action: 'repeat', mode: repeatMode });
    sendAndroidPlayback({ action: 'play', song: track, queue, position, autoplay: userWantsPlayingRef.current, request });
    if (upcoming.some((item) => !directAndroidTrack(item) || item.isDownloaded)) {
      refreshNativeQueue(song.id, upcoming);
    }
  };

  function playSongInternal(song: Song) {
    const songWithTime: Song = {
      ...song,
      playedAt: new Date().toISOString(),
    };
    currentSongRef.current = songWithTime;
    setCurrentSong(songWithTime);
    position.update(0, true);
    setDuration(songWithTime.duration || 210);
    addRecentlyPlayed(songWithTime);
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      return [songWithTime, ...filtered].slice(0, 50);
    });
    persistProgress(true, true);
    userWantsPlayingRef.current = true;

    if (androidBridge()) {
      void startNativeSong(songWithTime, 0);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const sourceUrl = songAudioUrl(songWithTime);
    const cachedOffline = getCachedOfflineUrl(songWithTime.id);
    const playFromUrl = (targetUrl: string) => {
      if (!targetUrl || currentSongRef.current !== songWithTime || !userWantsPlayingRef.current) return;
      audio.src = targetUrl;
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Auto-play prevented or stream error:', err);
      });
    };

    if (cachedOffline) {
      playFromUrl(cachedOffline);
    } else if (songWithTime.isDownloaded || !navigator.onLine || sourceUrl.startsWith('blob:')) {
      getOfflineBlobUrl(songWithTime.id).then((offlineUrl) => playFromUrl(offlineUrl || sourceUrl));
    } else {
      playFromUrl(sourceUrl);
    }
  }

  function playSong(song: Song, newQueue?: Song[]) {
    if (!isPlayableSong(song)) {
      setIsQueueOpen(false);
      setIsNowPlayingOpen(false);
      showToast('Nguồn của bài đã lưu không còn phát được. Hãy chọn bản audio trong Tìm kiếm.', 'info');
      router.push('/search?' + new URLSearchParams({ q: songSearchTitle(song) }).toString());
      return;
    }
    if (newQueue) {
      const filteredQueue = newQueue.filter((item) => item.id !== song.id && isPlayableSong(item));
      queueRef.current = filteredQueue;
      setQueue(filteredQueue);
      saveStoredQueue(filteredQueue);
    }
    playSongInternal(song);
  }

  function playCollection(songs: Song[]) {
    const firstSong = songs.find(isPlayableSong);
    if (firstSong) playSong(firstSong, songs);
    else if (songs.length > 0) playSong(songs[0]);
  }

  function togglePlay() {
    if (isPlaying) {
      pauseSong();
      return;
    }
    if (!currentSong) return;
    userWantsPlayingRef.current = true;

    if (androidBridge()) {
      if (nativeActiveRef.current) {
        if (!nativePendingIdRef.current) sendAndroidPlayback({ action: 'resume' });
        else setIsPlaying(true);
      } else {
        void startNativeSong(currentSong, position.read());
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src && audio.src.includes(songAudioUrl(currentSong))) {
      audio.currentTime = position.read();
      audio.play().then(() => {
        setIsPlaying(true);
        persistProgress(true, true);
      }).catch(() => playSongInternal(currentSong));
    } else {
      playSongInternal(currentSong);
    }
  }

  function pauseSong() {
    userWantsPlayingRef.current = false;
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'pause' });
    } else {
      audioRef.current?.pause();
    }
    setIsPlaying(false);
    persistProgress(true, false);
  }

  const resumeSong = () => {
    togglePlay();
  };

  function seekTo(time: number) {
    position.update(time, true);
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'seek', position: time });
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    persistProgress(true);
  }

  const setVolume = (val: number) => {
    const bounded = Math.max(0, Math.min(1, val));
    setVolumeState(bounded);
    setIsMuted(bounded === 0);
    if (androidBridge()) sendAndroidPlayback({ action: 'volume', value: bounded });

    if (audioRef.current) {
      audioRef.current.volume = bounded;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('spotify_volume', bounded.toString());
    }
  };

  const toggleMute = () => {
    if (androidBridge()) sendAndroidPlayback({ action: 'volume', value: isMuted ? volume || 0.8 : 0 });
    if (isMuted) {
      const targetVol = volume || 0.8;
      if (audioRef.current) audioRef.current.volume = targetVol;
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    if (androidBridge()) sendAndroidPlayback({ action: 'shuffle', enabled: !isShuffle });
  };

  const cycleRepeatMode = () => {
    const mode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(mode);
    if (androidBridge()) sendAndroidPlayback({ action: 'repeat', mode });
  };

  const updateQueue = (songs: Song[]) => {
    queueRef.current = songs;
    setQueue(songs);
    saveStoredQueue(songs);
    if (nativeActiveRef.current && !nativePendingIdRef.current && currentSongRef.current) {
      refreshNativeQueue(currentSongRef.current.id, songs);
    }
  };

  const addToQueue = (song: Song) => {
    if (isPlayableSong(song)) updateQueue([...queueRef.current, song]);
    else showToast('Bài này chưa có nguồn audio để thêm vào hàng đợi.', 'info');
  };
  const removeFromQueue = (index: number) => updateQueue(queueRef.current.filter((_, i) => i !== index));
  const clearQueue = () => updateQueue([]);

  const clearHistory = useCallback(() => {
    clearStoredRecentlyPlayed();
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback((songId: string) => {
    removeRecentlyPlayedItem(songId);
    setHistory((prev) => prev.filter((s) => s.id !== songId));
  }, []);

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (androidBridge()) sendAndroidPlayback({ action: 'rate', value: rate });
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Global Keyboard Shortcuts (Space for Play/Pause, KeyM for Mute, Arrow Keys for Seek)
  const onKeyboardShortcut = useEffectEvent((e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration, position.read() + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, position.read() - 5));
      }
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => onKeyboardShortcut(e);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        duration,
        volume: isMuted ? 0 : volume,
        isMuted,
        isShuffle,
        repeatMode,
        playbackRate,
        queue,
        history,
        isNowPlayingOpen,
        isLyricsOpen,
        isQueueOpen,
        playSong,
        playCollection,
        togglePlay,
        pauseSong,
        resumeSong,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeatMode,
        playNext,
        playPrevious,
        addToQueue,
        removeFromQueue,
        clearQueue,
        clearHistory,
        removeFromHistory,
        setPlaybackRate,
        setIsNowPlayingOpen,
        setIsLyricsOpen,
        setIsQueueOpen,
      }}
    >
      <AudioPositionContext.Provider value={position}>
        {children}
      </AudioPositionContext.Provider>
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

export function useAudioPosition(enabled = true) {
  const position = useContext(AudioPositionContext);
  if (!position) throw new Error('useAudioPosition must be used within an AudioProvider');
  return useSyncExternalStore(
    enabled ? position.subscribe : skipPositionSubscription,
    enabled ? position.getSnapshot : initialAudioPosition,
    initialAudioPosition,
  );
}
