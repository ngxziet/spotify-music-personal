'use client';

import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, useCallback } from 'react';
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
import { createAudioPosition } from './audioPosition';

const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const initialAudioPosition = () => 0;
const skipPositionSubscription = () => () => {};

interface YouTubePlayer {
  loadVideoById(video: string | { videoId: string; startSeconds: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoData(): { video_id?: string };
  seekTo(time: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (id: string, options: {
        height: string;
        width: string;
        playerVars: Record<string, number>;
        events: {
          onReady(event: { target: YouTubePlayer }): void;
          onStateChange(event: { target: YouTubePlayer; data: number }): void;
          onError(): void;
        };
      }) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

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
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const userWantsPlayingRef = useRef<boolean>(false);
  const nativeActiveRef = useRef(false);
  const nativePendingIdRef = useRef('');
  const nativeRequestRef = useRef(0);
  const nativeQueueRevisionRef = useRef(0);
  const nativeSongsRef = useRef(new Map<string, Song>());
  const nativeErrorRef = useRef('');
  const { showToast } = usePwa();
  const lastSavedAtRef = useRef(0);

  const [position] = useState(createAudioPosition);
  const [loadYouTube, setLoadYouTube] = useState(false);
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
        if (currentSongRef.current?.youtubeId) {
          userWantsPlayingRef.current = false;
          ytPlayerRef.current?.pauseVideo();
        }
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

    const isHtmlPlayback = () => !nativeActiveRef.current && !currentSongRef.current?.youtubeId;

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
    const storedQueue = getStoredQueue();
    const lastPlayed = getStoredLastPlayed();
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

      if (!lastPlayed.song.youtubeId && audioRef.current && lastPlayed.song.audioUrl) {
        if (lastPlayed.song.audioUrl.startsWith('blob:')) {
          getOfflineBlobUrl(lastPlayed.song.id).then((freshUrl) => {
            if (freshUrl && audioRef.current && currentSongRef.current?.id === lastPlayed.song.id) {
              audioRef.current.src = freshUrl;
              audioRef.current.currentTime = savedTime;
            }
          });
        } else {
          audioRef.current.src = lastPlayed.song.audioUrl;
          audioRef.current.currentTime = savedTime;
        }
      }
    }
  }, [position]);

  const onYouTubeEnded = useEffectEvent(() => playNext());
  const onYouTubeReady = useEffectEvent((player: YouTubePlayer) => {
    ytPlayerRef.current = player;
    player.setVolume(isMuted ? 0 : volume * 100);
    playYouTube(position.read());
  });
  const onYouTubeError = useEffectEvent(() => {
    if (!currentSongRef.current?.youtubeId) return;
    userWantsPlayingRef.current = false;
    setIsPlaying(false);
    showToast('Không phát được bài YouTube này.', 'warning');
  });

  // Load the iframe API on the first request to play a YouTube track.
  useEffect(() => {
    if (!loadYouTube) return;
    let active = true;
    let script: HTMLScriptElement | undefined;
    let player: YouTubePlayer | undefined;

    const initYt = () => {
      if (!active || player || !window.YT?.Player) return;
      try {
        player = new window.YT.Player('soundwave-yt-player', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              if (active) onYouTubeReady(event.target);
            },
            onStateChange: (event) => {
              const songId = currentSongRef.current?.youtubeId;
              if (!active || !songId) return;
              const videoId = event.target.getVideoData?.()?.video_id;
              if (videoId && videoId !== songId) return;
              if (event.data === 1) {
                if (document.hidden || !userWantsPlayingRef.current) {
                  event.target.pauseVideo();
                  return;
                }
                setIsPlaying(true);
                const d = event.target.getDuration();
                if (d && d > 0) setDuration(d);
              } else if (event.data === 2) {
                userWantsPlayingRef.current = false;
                position.update(event.target.getCurrentTime(), true);
                setIsPlaying(false);
                persistProgress(true, false);
              } else if (event.data === 0) {
                onYouTubeEnded();
              }
            },
            onError: () => { if (active) onYouTubeError(); },
          },
        });
      } catch {
        onYouTubeError();
        setLoadYouTube(false);
      }
    };

    if (window.YT?.Player) {
      initYt();
    } else {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        if (!active) return;
        onYouTubeError();
        setLoadYouTube(false);
      };
      window.onYouTubeIframeAPIReady = initYt;
      document.head.appendChild(script);
    }
    return () => {
      active = false;
      if (window.onYouTubeIframeAPIReady === initYt) delete window.onYouTubeIframeAPIReady;
      script?.remove();
      player?.destroy();
      ytPlayerRef.current = null;
    };
  }, [loadYouTube, persistProgress, position]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!currentSong?.youtubeId || !isPlaying || !player) return;
    const timer = window.setInterval(() => {
      if (document.hidden || !userWantsPlayingRef.current) return;
      position.update(player.getCurrentTime());
      persistProgress(false, true);
    }, 500);
    return () => window.clearInterval(timer);
  }, [currentSong?.youtubeId, isPlaying, persistProgress, position]);

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
      setQueue(remainingQueue);
      playSongInternal(nextSong);
    } else if (repeatMode === 'all' && history.length > 0) {
      const songs = [...history].reverse();
      if (currentSong) songs.push(currentSong);
      setQueue(songs.slice(1));
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

    if (history.length > 1) {
      const prevSong = history[1];
      if (currentSong) {
        setQueue((prev) => [currentSong, ...prev]);
      }
      playSongInternal(prevSong);
    } else {
      seekTo(0);
    }
  }

  // Handle HTML5 track ended
  const onAudioEnded = useEffectEvent((audio: HTMLAudioElement) => {
    if (nativeActiveRef.current || currentSongRef.current?.youtubeId) return;
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
    if (!event.id || currentSongRef.current?.youtubeId) return;
    if (nativePendingIdRef.current && (nativePendingIdRef.current !== event.id
        || nativeRequestRef.current !== event.request)) return;

    const previousSong = currentSongRef.current;
    const song = nativeSongsRef.current.get(event.id)
      ?? (previousSong?.id === event.id ? previousSong : undefined)
      ?? queueRef.current.find((item) => item.id === event.id)
      ?? getStoredRecentlyPlayed().find((item) => item.id === event.id);
    if (!song) return;
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
    ytPlayerRef.current?.pauseVideo();
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
    if (upcoming.some((item) => !item.youtubeId && (!directAndroidTrack(item) || item.isDownloaded))) {
      refreshNativeQueue(song.id, upcoming);
    }
  };

  function playYouTube(seconds: number, restart = false) {
    const videoId = currentSongRef.current?.youtubeId;
    if (!videoId || document.hidden || !userWantsPlayingRef.current) return;

    const player = ytPlayerRef.current;
    if (!player) {
      setLoadYouTube(true);
      return;
    }
    if (restart || player.getVideoData?.()?.video_id !== videoId) {
      player.loadVideoById({ videoId, startSeconds: seconds });
    } else {
      player.playVideo();
    }
  }

  // Internal play dispatcher: handles YouTube or HTML5
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
    if (!songWithTime.youtubeId) setLoadYouTube(false);

    if (androidBridge()) {
      if (!songWithTime.youtubeId) {
        void startNativeSong(songWithTime, 0);
        return;
      }
      nativeRequestRef.current++;
      nativeQueueRevisionRef.current++;
      nativePendingIdRef.current = '';
      nativeActiveRef.current = false;
      sendAndroidPlayback({ action: 'stop' });
      showToast('Mở trình phát để tìm bản nghe nền cho bài YouTube này.', 'info');
    }

    if (songWithTime.youtubeId) {
      audioRef.current?.pause();
      setIsPlaying(false);
      playYouTube(0, true);
    } else {
      // Pause YouTube player
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }

      const audio = audioRef.current;
      if (audio) {
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
        } else if (songWithTime.isDownloaded || (typeof navigator !== 'undefined' && !navigator.onLine) || songWithTime.audioUrl?.startsWith('blob:')) {
          getOfflineBlobUrl(songWithTime.id).then((offlineUrl) => {
            playFromUrl(offlineUrl || songWithTime.audioUrl);
          });
        } else if (songWithTime.audioUrl) {
          playFromUrl(songWithTime.audioUrl);
        }
      }
    }
  }

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (newQueue) {
      const filteredQueue = newQueue.filter((s) => s.id !== song.id);
      queueRef.current = filteredQueue;
      setQueue(filteredQueue);
      saveStoredQueue(filteredQueue);
    }
    playSongInternal(song);
  };

  function togglePlay() {
    if (isPlaying) {
      pauseSong();
    } else {
      if (!currentSong) return;
      userWantsPlayingRef.current = true;

      if (androidBridge() && !currentSong.youtubeId) {
        if (nativeActiveRef.current) {
          if (!nativePendingIdRef.current) sendAndroidPlayback({ action: 'resume' });
          else setIsPlaying(true);
        } else {
          void startNativeSong(currentSong, position.read());
        }
        return;
      }

      if (currentSong.youtubeId) {
        playYouTube(position.read());
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.src && audio.src.includes(currentSong.audioUrl)) {
          audio.currentTime = position.read();
          audio.play().then(() => {
            setIsPlaying(true);
            persistProgress(true, true);
          }).catch(() => {
            playSongInternal(currentSong);
          });
        } else {
          playSongInternal(currentSong);
        }
      }
    }
  }

  function pauseSong() {
    userWantsPlayingRef.current = false;
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'pause' });
    } else if (currentSong?.youtubeId) {
      ytPlayerRef.current?.pauseVideo();
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
    } else if (currentSong?.youtubeId) {
      try {
        ytPlayerRef.current?.seekTo(time, true);
      } catch {}
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
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(bounded * 100);
      } catch {}
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
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(targetVol * 100);
      }
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.volume = 0;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(0);
      }
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

  const addToQueue = (song: Song) => updateQueue([...queueRef.current, song]);
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
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
      try {
        ytPlayerRef.current.setPlaybackRate(rate);
      } catch {}
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
        {loadYouTube && (
          <div
            className="pointer-events-none fixed bottom-0 right-0 -z-50 h-[150px] w-[200px] opacity-[0.01]"
            aria-hidden="true"
          >
            <div id="soundwave-yt-player" />
          </div>
        )}
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
