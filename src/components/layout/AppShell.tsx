'use client';

import React, { useState } from 'react';
import { AudioProvider } from '@/context/AudioContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { PwaProvider } from '@/context/PwaContext';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNavigation } from './MobileNavigation';
import { PersistentPlayer } from '../player/PersistentPlayer';
import { FullscreenNowPlaying } from '../player/FullscreenNowPlaying';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { UploadSongModal } from '../modals/UploadSongModal';
import { AuthModal } from '../modals/AuthModal';
import { SleepTimerModal } from '../modals/SleepTimerModal';
import { LyricsModal } from '../modals/LyricsModal';
import { QueueDrawer } from '../modals/QueueDrawer';
import { InstallAppModal } from '../modals/InstallAppModal';
import { PwaStatusBar } from '../pwa/PwaStatusBar';
import { AndroidWebUpdates } from './AndroidWebUpdates';

export function AppShell({ children, version }: { children: React.ReactNode; version: string }) {
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isUploadSongOpen, setIsUploadSongOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);

  return (
    <PwaProvider>
      <AudioProvider>
        <AndroidWebUpdates version={version} />
        <LibraryProvider>
          <div className="flex h-[100dvh] w-full overflow-hidden bg-black text-white pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
            {/* Left Desktop / Tablet Sidebar */}
            <Sidebar
              onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
              onOpenUploadSong={() => setIsUploadSongOpen(true)}
            />

            {/* Right Main Scroll Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#121212] md:my-2 md:mr-2 md:rounded-lg">
              {/* Top Header */}
              <TopHeader onOpenAuthModal={() => setIsAuthOpen(true)} />

              {/* Main Page View (scrollable with safe area for bottom player & navigation) */}
              <main className="flex-1 overflow-y-auto overscroll-contain pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] md:pb-28">
                <PwaStatusBar />
                {children}
              </main>
            </div>
          </div>

          {/* Bottom Persistent Audio Player */}
          <PersistentPlayer onOpenSleepTimer={() => setIsSleepTimerOpen(true)} />

          {/* Mobile Bottom Navigation */}
          <MobileNavigation onOpenAuthModal={() => setIsAuthOpen(true)} />

          {/* Modals & Overlays */}
          <FullscreenNowPlaying onOpenSleepTimer={() => setIsSleepTimerOpen(true)} />
          <LyricsModal />
          <QueueDrawer />
          <InstallAppModal />

          {/* Background YouTube Audio Engine (Kept inside viewport with 0.01 opacity for background playback across tabs) */}
          <div
            className="fixed bottom-0 right-0 w-[200px] h-[150px] -z-50 pointer-events-none"
            style={{ opacity: 0.01 }}
            aria-hidden="true"
          >
            <div id="soundwave-yt-player" />
          </div>

          <CreatePlaylistModal
            isOpen={isCreatePlaylistOpen}
            onClose={() => setIsCreatePlaylistOpen(false)}
          />
          <UploadSongModal
            isOpen={isUploadSongOpen}
            onClose={() => setIsUploadSongOpen(false)}
          />
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />
          <SleepTimerModal
            isOpen={isSleepTimerOpen}
            onClose={() => setIsSleepTimerOpen(false)}
          />
        </LibraryProvider>
      </AudioProvider>
    </PwaProvider>
  );
}
