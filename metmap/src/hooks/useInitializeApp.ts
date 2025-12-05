'use client';

import { useEffect, useState } from 'react';
import { useMetMapStore } from '@/stores/useMetMapStore';
import { createDemoSong, isDemoSong } from '@/lib/demoSong';
import { isFeatureEnabled } from '@/lib/featureFlags';

const DEMO_LOADED_KEY = 'metmap-demo-loaded';

/**
 * Hook to initialize the app for first-time users
 * - Loads demo song if no songs exist
 * - Returns initialization status
 */
export function useInitializeApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [demoSongId, setDemoSongId] = useState<string | null>(null);
  const songs = useMetMapStore((state) => state.songs);
  const importSong = useMetMapStore((state) => state.importSong);

  useEffect(() => {
    // Skip if already initialized or feature disabled
    if (isInitialized) return;

    // Check if demo song should be loaded
    const shouldLoadDemo =
      isFeatureEnabled('demoSong') &&
      songs.length === 0 &&
      typeof window !== 'undefined' &&
      localStorage.getItem(DEMO_LOADED_KEY) !== 'true';

    if (shouldLoadDemo) {
      const demoSong = createDemoSong();
      importSong(demoSong);
      localStorage.setItem(DEMO_LOADED_KEY, 'true');
      setDemoSongId(demoSong.id);
    } else {
      // Find existing demo song
      const existingDemo = songs.find(isDemoSong);
      if (existingDemo) {
        setDemoSongId(existingDemo.id);
      }
    }

    setIsInitialized(true);
  }, [isInitialized, songs, importSong]);

  return {
    isInitialized,
    demoSongId,
    hasDemoSong: demoSongId !== null || songs.some(isDemoSong),
  };
}

/**
 * Check if this is a first-time user (no songs ever created)
 */
export function useIsFirstTimeUser(): boolean {
  const songs = useMetMapStore((state) => state.songs);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const demoLoaded = localStorage.getItem(DEMO_LOADED_KEY) === 'true';
    // First time if no songs and demo hasn't been loaded yet
    setIsFirstTime(songs.length === 0 && !demoLoaded);
  }, [songs.length]);

  return isFirstTime;
}
