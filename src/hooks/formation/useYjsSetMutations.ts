/**
 * useYjsSetMutations — Drill set mutation functions for Yjs formation documents.
 *
 * Extracted from useFormationYjs to keep each file under 600 lines.
 * Handles: addSet, updateSet, removeSet, reorderSets.
 */

import { useCallback, type MutableRefObject } from 'react';
import * as Y from 'yjs';
import type { DrillSet } from '@/services/formationService';
import {
  FORMATION_YJS_TYPES,
  drillSetToYMapEntries,
} from '@/services/formation/yjs/formationYjsTypes';

interface UseYjsSetMutationsRefs {
  docRef: MutableRefObject<Y.Doc | null>;
}

export function useYjsSetMutations({ docRef }: UseYjsSetMutationsRefs) {
  const addSet = useCallback((
    keyframeId: string,
    counts: number,
    options?: Partial<Pick<DrillSet, 'name' | 'label' | 'notes' | 'rehearsalMark'>>,
  ): DrillSet => {
    const ydoc = docRef.current;
    if (!ydoc) throw new Error('Yjs document not initialized');

    const setsArray = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

    let maxSortOrder = -1;
    for (let i = 0; i < setsArray.length; i++) {
      const ySet = setsArray.get(i) as Y.Map<unknown>;
      const order = ySet.get('sortOrder') as number;
      if (order > maxSortOrder) maxSortOrder = order;
    }

    const drillSet: DrillSet = {
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: options?.name || `Set ${setsArray.length + 1}`,
      counts,
      keyframeId,
      sortOrder: maxSortOrder + 1,
    };
    if (options?.label) drillSet.label = options.label;
    if (options?.notes) drillSet.notes = options.notes;
    if (options?.rehearsalMark) drillSet.rehearsalMark = options.rehearsalMark;

    ydoc.transact(() => {
      const ySet = new Y.Map();
      drillSetToYMapEntries(drillSet).forEach(([key, value]) => {
        ySet.set(key, value);
      });

      let insertIndex = setsArray.length;
      for (let i = 0; i < setsArray.length; i++) {
        const existing = setsArray.get(i) as Y.Map<unknown>;
        if ((existing.get('sortOrder') as number) > drillSet.sortOrder) {
          insertIndex = i;
          break;
        }
      }

      setsArray.insert(insertIndex, [ySet]);
    });

    return drillSet;
  }, [docRef]);

  const updateSet = useCallback((setId: string, updates: Partial<Omit<DrillSet, 'id'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const setsArray = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

    ydoc.transact(() => {
      for (let i = 0; i < setsArray.length; i++) {
        const ySet = setsArray.get(i) as Y.Map<unknown>;
        if (ySet.get('id') === setId) {
          if (updates.name !== undefined) ySet.set('name', updates.name);
          if (updates.label !== undefined) ySet.set('label', updates.label);
          if (updates.counts !== undefined) ySet.set('counts', updates.counts);
          if (updates.keyframeId !== undefined) ySet.set('keyframeId', updates.keyframeId);
          if (updates.notes !== undefined) ySet.set('notes', updates.notes);
          if (updates.rehearsalMark !== undefined) ySet.set('rehearsalMark', updates.rehearsalMark);
          if (updates.sortOrder !== undefined) ySet.set('sortOrder', updates.sortOrder);
          break;
        }
      }
    });
  }, [docRef]);

  const removeSet = useCallback((setId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const setsArray = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

    ydoc.transact(() => {
      for (let i = 0; i < setsArray.length; i++) {
        const ySet = setsArray.get(i) as Y.Map<unknown>;
        if (ySet.get('id') === setId) {
          setsArray.delete(i, 1);
          break;
        }
      }
    });
  }, [docRef]);

  const reorderSets = useCallback((fromIndex: number, toIndex: number) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const setsArray = ydoc.getArray(FORMATION_YJS_TYPES.SETS);
    if (fromIndex < 0 || fromIndex >= setsArray.length) return;
    if (toIndex < 0 || toIndex >= setsArray.length) return;
    if (fromIndex === toIndex) return;

    ydoc.transact(() => {
      const movingSet = setsArray.get(fromIndex) as Y.Map<unknown>;
      const movingData: [string, unknown][] = [];
      movingSet.forEach((value, key) => {
        movingData.push([key, value]);
      });

      setsArray.delete(fromIndex, 1);

      const ySet = new Y.Map();
      movingData.forEach(([key, value]) => {
        ySet.set(key, value);
      });

      setsArray.insert(toIndex, [ySet]);

      for (let i = 0; i < setsArray.length; i++) {
        const s = setsArray.get(i) as Y.Map<unknown>;
        s.set('sortOrder', i);
      }
    });
  }, [docRef]);

  return { addSet, updateSet, removeSet, reorderSets };
}
