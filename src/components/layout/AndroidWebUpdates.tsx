'use client';

import { useEffect, useEffectEvent } from 'react';
import { useAudio } from '@/context/AudioContext';
import { androidBridge } from '@/utils/androidPlayback';

export function AndroidWebUpdates({ version }: { version: string }) {
  const { isPlaying } = useAudio();
  const canReload = useEffectEvent(() => !isPlaying
    && !document.hidden
    && !document.activeElement?.matches('input, textarea, [contenteditable]'));

  useEffect(() => {
    if (!version || !androidBridge()) return;
    let stopped = false;
    let checking = false;

    async function checkVersion() {
      if (checking || !canReload()) return;
      checking = true;
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store' });
        if (!response.ok) return;
        const latest = (await response.json()).version;
        if (!stopped && latest && latest !== version && canReload()) window.location.reload();
      } catch {
        // Keep the current page available when offline.
      } finally {
        checking = false;
      }
    }

    const timer = window.setInterval(checkVersion, 5 * 60_000);
    document.addEventListener('visibilitychange', checkVersion);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkVersion);
    };
  }, [version]);

  return null;
}
