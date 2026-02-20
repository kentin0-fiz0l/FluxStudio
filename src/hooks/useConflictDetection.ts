/**
 * useConflictDetection — Detects when two peers edit the same section/keyframe
 * and shows a toast notification.
 *
 * Sprint 32: Informational only — does not block editing.
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { MetMapPresence } from '../services/metmapCollaboration';
import type { Section } from '../contexts/metmap/types';
import { isPeerIdle } from './useMetMapPresence';

const DEDUP_COOLDOWN_MS = 30_000; // Don't re-toast same conflict within 30s

export function useConflictDetection(
  localEditingSection: string | null,
  localSelectedKeyframe: string | null,
  remotePeers: MetMapPresence[],
  sections: Section[]
): void {
  const shownRef = useRef<Map<string, number>>(new Map());

  // Section conflict detection
  useEffect(() => {
    if (!localEditingSection) return;

    const now = Date.now();
    const conflicting = remotePeers.filter(
      (p) => p.editingSection === localEditingSection && !isPeerIdle(p)
    );

    for (const peer of conflicting) {
      const key = `section-${peer.userId}-${localEditingSection}`;
      const lastShown = shownRef.current.get(key);
      if (lastShown && now - lastShown < DEDUP_COOLDOWN_MS) continue;

      shownRef.current.set(key, now);
      const sectionName =
        sections.find((s) => s.id === localEditingSection)?.name || 'this section';

      toast.warning(`${peer.username} is also editing "${sectionName}"`, {
        id: key,
        duration: 5000,
        description: 'Your changes will merge automatically via Yjs.',
      });
    }
  }, [localEditingSection, remotePeers, sections]);

  // Keyframe conflict detection
  useEffect(() => {
    if (!localSelectedKeyframe) return;

    const now = Date.now();
    const conflicting = remotePeers.filter(
      (p) => p.selectedKeyframe === localSelectedKeyframe && !isPeerIdle(p)
    );

    for (const peer of conflicting) {
      const key = `keyframe-${peer.userId}-${localSelectedKeyframe}`;
      const lastShown = shownRef.current.get(key);
      if (lastShown && now - lastShown < DEDUP_COOLDOWN_MS) continue;

      shownRef.current.set(key, now);
      toast(`${peer.username} is editing the same keyframe`, {
        id: key,
        duration: 3000,
      });
    }
  }, [localSelectedKeyframe, remotePeers]);

  // Cleanup stale dedup entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of shownRef.current.entries()) {
        if (now - timestamp > DEDUP_COOLDOWN_MS * 2) {
          shownRef.current.delete(key);
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
}
