/**
 * useAdaptiveLoading — Adapt UI based on network & device capabilities
 *
 * Sprint 39: Mobile-First UX
 */

import { useState, useEffect } from 'react';

type ConnectionEffectiveType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInfo {
  effectiveType: ConnectionEffectiveType;
  saveData: boolean;
  downlink: number;
}

interface AdaptiveLoadingState {
  /** Connection speed category */
  connectionType: ConnectionEffectiveType;
  /** User has enabled data saver in browser */
  saveData: boolean;
  /** User prefers reduced motion (OS accessibility setting) */
  prefersReducedMotion: boolean;
  /** Whether to load heavy assets (images, animations) */
  shouldLoadHeavyAssets: boolean;
  /** Whether to enable animations */
  shouldAnimate: boolean;
  /** Image quality tier: 'low' | 'medium' | 'high' */
  imageQuality: 'low' | 'medium' | 'high';
}

function getNetworkInfo(): NetworkInfo {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number } };
  const conn = nav.connection;
  return {
    effectiveType: (conn?.effectiveType as ConnectionEffectiveType) || '4g',
    saveData: conn?.saveData ?? false,
    downlink: conn?.downlink ?? 10,
  };
}

export function useAdaptiveLoading(): AdaptiveLoadingState {
  const [state, setState] = useState<AdaptiveLoadingState>(() => {
    const network = getNetworkInfo();
    const reducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    return computeState(network, reducedMotion);
  });

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: EventTarget & { effectiveType?: string; saveData?: boolean; downlink?: number } };
    const conn = nav.connection;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      const network = getNetworkInfo();
      setState(computeState(network, motionQuery.matches));
    };

    conn?.addEventListener('change', update);
    motionQuery.addEventListener('change', update);

    return () => {
      conn?.removeEventListener('change', update);
      motionQuery.removeEventListener('change', update);
    };
  }, []);

  return state;
}

function computeState(network: NetworkInfo, prefersReducedMotion: boolean): AdaptiveLoadingState {
  const isSlow = network.effectiveType === 'slow-2g' || network.effectiveType === '2g';
  const isMedium = network.effectiveType === '3g';

  const shouldLoadHeavyAssets = !isSlow && !network.saveData;
  const shouldAnimate = !prefersReducedMotion && !isSlow;

  let imageQuality: 'low' | 'medium' | 'high' = 'high';
  if (isSlow || network.saveData) {
    imageQuality = 'low';
  } else if (isMedium) {
    imageQuality = 'medium';
  }

  return {
    connectionType: network.effectiveType,
    saveData: network.saveData,
    prefersReducedMotion,
    shouldLoadHeavyAssets,
    shouldAnimate,
    imageQuality,
  };
}
