'use client';

import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useState, useCallback } from 'react';
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

interface YouTubePlayer {
  cueVideoById(options: { videoId: string; startSeconds: number }): void;
  loadVideoById(video: string | { videoId: string; startSeconds: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoData(): { video_id?: string };
  seekTo(time: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
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
          onStateChange(event: { data: number }): void;
        };
      }) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface AudioContextType {
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

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const ytTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userWantsPlayingRef = useRef<boolean>(false);
  const nativeActiveRef = useRef(false);
  const nativePendingIdRef = useRef('');
  const nativeRequestRef = useRef(0);
  const nativeQueueRevisionRef = useRef(0);
  const nativeSongsRef = useRef(new Map<string, Song>());
  const nativeErrorRef = useRef('');
  const { showToast } = usePwa();
  const ytVideoCuedRef = useRef<string>('');
  const lastSavedTimeRef = useRef<number>(0);

  const [currentSong, setCurrentSong] = useState<Song | null>(() => CURATED_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
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
  const currentTimeRef = useRef<number>(currentTime);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const queueRef = useRef<Song[]>(queue);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Persist current song, position and queue before page reload or tab close
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeUnload = () => {
      if (currentSongRef.current) {
        saveStoredLastPlayed(
          currentSongRef.current,
          currentTimeRef.current,
          isPlayingRef.current
        );
      }
      if (queueRef.current && queueRef.current.length > 0) {
        saveStoredQueue(queueRef.current);
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Initialize HTML5 Audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.src = CURATED_SONGS[0].audioUrl;
    audio.preload = 'metadata';
    audioRef.current = audio;

    const savedVol = localStorage.getItem('spotify_volume');
    if (savedVol) {
      const volNum = parseFloat(savedVol);
      audio.volume = volNum;
      queueMicrotask(() => setVolumeState(volNum));
    } else {
      audio.volume = 0.8;
    }

    const onPlay = () => {
      if (!nativeActiveRef.current && !currentSongRef.current?.youtubeId) setIsPlaying(true);
    };
    const onPause = () => {
      if (!nativeActiveRef.current && !currentSongRef.current?.youtubeId) setIsPlaying(false);
    };
    const onTimeUpdate = () => {
      if (!nativeActiveRef.current && !currentSongRef.current?.youtubeId) {
        const t = audio.currentTime;
        setCurrentTime(t);
        if (Math.abs(t - lastSavedTimeRef.current) >= 2) {
          lastSavedTimeRef.current = t;
          if (currentSongRef.current) {
            saveStoredLastPlayed(currentSongRef.current, t, isPlayingRef.current);
          }
        }
      }
    };
    const onLoadedMetadata = () => {
      if (!nativeActiveRef.current && !currentSongRef.current?.youtubeId) {
        setDuration(audio.duration || 0);
      }
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
    };
  }, []);

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
      setCurrentTime(lastPlayed.currentTime || 0);
    });
    if (lastPlayed?.song) {
      currentSongRef.current = lastPlayed.song;
      const savedTime = lastPlayed.currentTime || 0;
      lastSavedTimeRef.current = savedTime;

      if (!lastPlayed.song.youtubeId && audioRef.current && lastPlayed.song.audioUrl) {
        if (lastPlayed.song.audioUrl.startsWith('blob:')) {
          getOfflineBlobUrl(lastPlayed.song.id).then((freshUrl) => {
            if (freshUrl && audioRef.current) {
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
  }, []);

  const onYouTubeEnded = useEffectEvent(() => playNext());

  // Initialize YouTube Iframe Player API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initYt = () => {
      if (!window.YT || !window.YT.Player) return;
      try {
        ytPlayerRef.current = new window.YT.Player('soundwave-yt-player', {
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
              const lastPlayed = getStoredLastPlayed();
              if (lastPlayed?.song?.youtubeId) {
                try {
                  event.target.cueVideoById({
                    videoId: lastPlayed.song.youtubeId,
                    startSeconds: lastPlayed.currentTime || 0,
                  });
                  ytVideoCuedRef.current = lastPlayed.song.youtubeId;
                } catch (e) {
                  console.warn('Failed to cue restored YouTube track:', e);
                }
              }
            },
            onStateChange: (event) => {
              if (!currentSongRef.current?.youtubeId) return;
              if (event.data === 1) {
                setIsPlaying(true);
                userWantsPlayingRef.current = true;
                const d = ytPlayerRef.current?.getDuration();
                if (d && d > 0) setDuration(d);
              } else if (event.data === 2) {
                setIsPlaying(false);
                userWantsPlayingRef.current = false;
              } else if (event.data === 0) {
                onYouTubeEnded();
              }
            },
          },
        });
      } catch (e) {
        console.warn('YouTube Player init error:', e);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initYt;
    } else {
      initYt();
    }
  }, []);

  // Poll current time when playing YouTube track & save progress
  useEffect(() => {
    if (currentSong?.youtubeId && isPlaying) {
      ytTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerRef.current.getCurrentTime();
            const d = ytPlayerRef.current.getDuration();
            if (t !== undefined && !isNaN(t)) {
              setCurrentTime(t);
              if (Math.abs(t - lastSavedTimeRef.current) >= 2) {
                lastSavedTimeRef.current = t;
                if (currentSongRef.current) {
                  saveStoredLastPlayed(currentSongRef.current, t, true);
                }
              }
            }
            if (d && d > 0 && !isNaN(d)) setDuration(d);
          } catch {}
        }
      }, 500);
    } else {
      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
    }

    return () => {
      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
    };
  }, [currentSong?.youtubeId, isPlaying]);

  // Ensure the YouTube player has cued the currentSong if restored from reload
  useEffect(() => {
    if (
      currentSong?.youtubeId &&
      ytPlayerRef.current &&
      typeof ytPlayerRef.current.cueVideoById === 'function' &&
      ytVideoCuedRef.current !== currentSong.youtubeId &&
      !isPlaying
    ) {
      try {
        ytPlayerRef.current.cueVideoById({
          videoId: currentSong.youtubeId,
          startSeconds: currentTime || 0,
        });
        ytVideoCuedRef.current = currentSong.youtubeId;
      } catch {}
    }
  }, [currentSong?.youtubeId, isPlaying, currentTime]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && currentSongRef.current?.youtubeId) ytPlayerRef.current?.pauseVideo();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

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
    if (currentTime > 3) {
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

    const song = nativeSongsRef.current.get(event.id)
      ?? [currentSongRef.current, ...queueRef.current, ...getStoredRecentlyPlayed()]
        .find((item) => item?.id === event.id);
    if (!song) return;
    nativePendingIdRef.current = '';
    nativeActiveRef.current = true;
    userWantsPlayingRef.current = event.playing;
    if (currentSongRef.current?.id !== song.id) {
      const nextSong = { ...song, playedAt: new Date().toISOString() };
      currentSongRef.current = nextSong;
      setCurrentSong(nextSong);
      addRecentlyPlayed(nextSong);
      setHistory((previous) => [nextSong, ...previous.filter(({ id }) => id !== song.id)].slice(0, 50));
      queueRef.current = queueRef.current.filter(({ id }) => id !== song.id);
      setQueue(queueRef.current);
      saveStoredQueue(queueRef.current);
      lastSavedTimeRef.current = -2;
    }
    currentTimeRef.current = event.position;
    setCurrentTime(event.position);
    setDuration(event.duration || song.duration);
    if (Math.abs(event.position - lastSavedTimeRef.current) >= 2 || event.playing !== isPlayingRef.current) {
      lastSavedTimeRef.current = event.position;
      saveStoredLastPlayed(song, event.position, event.playing);
    }
    isPlayingRef.current = event.playing;
    setIsPlaying(event.playing);
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

  // Internal play dispatcher: handles YouTube or HTML5
  function playSongInternal(song: Song) {
    const songWithTime: Song = {
      ...song,
      playedAt: new Date().toISOString(),
    };
    currentSongRef.current = songWithTime;
    setCurrentSong(songWithTime);
    setCurrentTime(0);
    lastSavedTimeRef.current = 0;
    setDuration(songWithTime.duration || 210);
    addRecentlyPlayed(songWithTime);
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      return [songWithTime, ...filtered].slice(0, 50);
    });
    saveStoredLastPlayed(songWithTime, 0, true);
    userWantsPlayingRef.current = true;

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
      showToast('Bài YouTube sẽ tạm dừng khi khóa màn hình.', 'info');
    }

    if (songWithTime.youtubeId) {
      const youtubeId = songWithTime.youtubeId;
      ytVideoCuedRef.current = youtubeId;
      // Pause HTML5 audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById(youtubeId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (e) {
          console.warn('YouTube play error:', e);
        }
      } else {
        // If YT API not ready yet, retry in 800ms
        setTimeout(() => {
          if (currentSongRef.current?.youtubeId === youtubeId && userWantsPlayingRef.current
              && ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(youtubeId);
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
          }
        }, 800);
      }
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
          if (!targetUrl) return;
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
          void startNativeSong(currentSong, currentTime);
        }
        return;
      }

      if (currentSong.youtubeId) {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          try {
            const currentData = ytPlayerRef.current.getVideoData?.();
            const currentVideoId = currentData?.video_id;
            if (currentVideoId !== currentSong.youtubeId) {
              ytPlayerRef.current.loadVideoById({
                videoId: currentSong.youtubeId,
                startSeconds: currentTime || 0,
              });
              ytVideoCuedRef.current = currentSong.youtubeId;
            } else {
              ytPlayerRef.current.playVideo();
            }
            setIsPlaying(true);
            saveStoredLastPlayed(currentSong, currentTime, true);
          } catch {
            playSongInternal(currentSong);
          }
        } else {
          playSongInternal(currentSong);
        }
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.src && audio.src.includes(currentSong.audioUrl)) {
          audio.currentTime = currentTime || 0;
          audio.play().then(() => {
            setIsPlaying(true);
            saveStoredLastPlayed(currentSong, currentTime, true);
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
    if (currentSong) {
      saveStoredLastPlayed(currentSong, currentTime, false);
    }
  }

  const resumeSong = () => {
    togglePlay();
  };

  function seekTo(time: number) {
    setCurrentTime(time);
    lastSavedTimeRef.current = time;
    if (nativeActiveRef.current) {
      sendAndroidPlayback({ action: 'seek', position: time });
    } else if (currentSong?.youtubeId) {
      try {
        ytPlayerRef.current?.seekTo(time, true);
      } catch {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (currentSong) {
      saveStoredLastPlayed(currentSong, time, isPlaying);
    }
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
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
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
        currentTime,
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
      {children}
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
