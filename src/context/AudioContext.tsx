'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Song, RepeatMode } from '@/types';
import { addRecentlyPlayed } from '@/utils/storage';
import { CURATED_SONGS } from '@/data/mockData';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
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
  setPlaybackRate: (rate: number) => void;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsLyricsOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytTimerRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const userWantsPlayingRef = useRef<boolean>(false);

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

  // Initialize HTML5 Audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.src = CURATED_SONGS[0].audioUrl;
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Background media-lock keeper: loop silent WAV to prevent background tab audio suspension
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silent.loop = true;
    silent.volume = 0.001;
    silentAudioRef.current = silent;

    const savedVol = localStorage.getItem('spotify_volume');
    if (savedVol) {
      const volNum = parseFloat(savedVol);
      audio.volume = volNum;
      setVolumeState(volNum);
    } else {
      audio.volume = 0.8;
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (audio && !currentSong?.youtubeId) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (audio && !currentSong?.youtubeId) {
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
            onStateChange: (event: any) => {
              // 1 = PLAYING
              if (event.data === 1) {
                setIsPlaying(true);
                userWantsPlayingRef.current = true;
                silentAudioRef.current?.play().catch(() => {});
                const d = ytPlayerRef.current?.getDuration();
                if (d && d > 0) setDuration(d);
              }
              // 2 = PAUSED
              else if (event.data === 2) {
                // If the user wants it playing and document is hidden (user switched tabs),
                // YouTube tried to auto-pause: immediately resume playback in background!
                if (userWantsPlayingRef.current && document.hidden) {
                  setTimeout(() => {
                    try {
                      ytPlayerRef.current?.playVideo();
                    } catch {}
                  }, 80);
                  return;
                }
                if (!userWantsPlayingRef.current) {
                  setIsPlaying(false);
                  silentAudioRef.current?.pause();
                }
              }
              // 0 = ENDED
              else if (event.data === 0) {
                playNext();
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

  // Poll current time when playing YouTube track
  useEffect(() => {
    if (currentSong?.youtubeId && isPlaying) {
      ytTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerRef.current.getCurrentTime();
            const d = ytPlayerRef.current.getDuration();
            if (t !== undefined && !isNaN(t)) setCurrentTime(t);
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

  // Keep background audio active when tab visibility changes (opening other tabs)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && userWantsPlayingRef.current) {
        silentAudioRef.current?.play().catch(() => {});
        if (currentSong?.youtubeId && ytPlayerRef.current) {
          setTimeout(() => {
            try {
              ytPlayerRef.current.playVideo();
            } catch {}
          }, 100);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [currentSong?.youtubeId]);

  // Update MediaSession metadata
  useEffect(() => {
    if (!currentSong || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

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

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seekTo(details.seekTime);
    });
  }, [currentSong]);

  // Play next song
  const playNext = useCallback(() => {
    if (queue.length > 0) {
      let nextIndex = 0;
      if (isShuffle && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const nextSong = queue[nextIndex];
      const remainingQueue = queue.filter((_, idx) => idx !== nextIndex);
      setQueue(remainingQueue);
      if (currentSong) {
        setHistory((prev) => [currentSong, ...prev.slice(0, 19)]);
      }
      playSongInternal(nextSong);
    } else if (repeatMode === 'all' && history.length > 0) {
      const songs = [...history.reverse(), currentSong].filter(Boolean) as Song[];
      if (songs.length > 0) {
        const first = songs[0];
        setQueue(songs.slice(1));
        playSongInternal(first);
      }
    } else {
      setIsPlaying(false);
    }
  }, [queue, isShuffle, currentSong, history, repeatMode]);

  // Play previous song
  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    if (history.length > 0) {
      const prevSong = history[0];
      setHistory((prev) => prev.slice(1));
      if (currentSong) {
        setQueue((prev) => [currentSong, ...prev]);
      }
      playSongInternal(prevSong);
    } else {
      seekTo(0);
    }
  }, [history, currentSong, currentTime]);

  // Handle HTML5 track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        playNext();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, playNext]);

  // Internal play dispatcher: handles YouTube or HTML5
  const playSongInternal = (song: Song) => {
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 210);
    addRecentlyPlayed(song);
    userWantsPlayingRef.current = true;
    silentAudioRef.current?.play().catch(() => {});

    if (song.youtubeId) {
      // Pause HTML5 audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById(song.youtubeId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (e) {
          console.warn('YouTube play error:', e);
        }
      } else {
        // If YT API not ready yet, retry in 800ms
        setTimeout(() => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(song.youtubeId);
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
      if (audio && song.audioUrl) {
        audio.src = song.audioUrl;
        audio.playbackRate = playbackRate;
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Auto-play prevented or stream error:', err);
        });
      }
    }
  };

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (currentSong) {
      setHistory((prev) => [currentSong, ...prev.slice(0, 19)]);
    }
    if (newQueue) {
      const filteredQueue = newQueue.filter((s) => s.id !== song.id);
      setQueue(filteredQueue);
    }
    playSongInternal(song);
  };

  const togglePlay = () => {
    if (isPlaying) {
      userWantsPlayingRef.current = false;
      silentAudioRef.current?.pause();
      if (currentSong?.youtubeId) {
        ytPlayerRef.current?.pauseVideo();
      } else {
        audioRef.current?.pause();
      }
      setIsPlaying(false);
    } else {
      userWantsPlayingRef.current = true;
      silentAudioRef.current?.play().catch(() => {});
      if (currentSong?.youtubeId) {
        ytPlayerRef.current?.playVideo();
        setIsPlaying(true);
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.src) {
          audio.play().catch(console.error);
        } else if (currentSong) {
          playSongInternal(currentSong);
        }
      }
    }
  };

  const pauseSong = () => {
    userWantsPlayingRef.current = false;
    silentAudioRef.current?.pause();
    if (currentSong?.youtubeId) {
      ytPlayerRef.current?.pauseVideo();
    } else {
      audioRef.current?.pause();
    }
    setIsPlaying(false);
  };

  const resumeSong = () => {
    userWantsPlayingRef.current = true;
    silentAudioRef.current?.play().catch(() => {});
    if (currentSong?.youtubeId) {
      ytPlayerRef.current?.playVideo();
      setIsPlaying(true);
    } else {
      audioRef.current?.play().catch(console.error);
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (currentSong?.youtubeId) {
      try {
        ytPlayerRef.current?.seekTo(time, true);
      } catch {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const setVolume = (val: number) => {
    const bounded = Math.max(0, Math.min(1, val));
    setVolumeState(bounded);
    setIsMuted(bounded === 0);

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
    setIsShuffle((prev) => !prev);
  };

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, currentTime, duration]);

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
