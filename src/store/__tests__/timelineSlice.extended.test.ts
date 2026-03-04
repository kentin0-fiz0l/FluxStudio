import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

import { createTimelineSlice, type TimelineSlice, type TimelineProject, type Clip } from '../slices/timelineSlice';

function createTestStore() {
  return create<TimelineSlice>()(
    immer((...args) => ({
      ...createTimelineSlice(...(args as Parameters<typeof createTimelineSlice>)),
    }))
  );
}

const makeProject = (): TimelineProject => ({
  id: 'tl-ext-1',
  name: 'Extended Test Timeline',
  duration: 60000,
  frameRate: 30,
  width: 1920,
  height: 1080,
  tracks: [],
  clips: {},
  markers: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
});

const makeClip = (overrides: Partial<Clip> = {}): Omit<Clip, 'id'> => ({
  trackId: 'track-1',
  type: 'media',
  name: 'Clip 1',
  startTime: 0,
  duration: 5000,
  locked: false,
  muted: false,
  animations: [],
  properties: {},
  ...overrides,
});

describe('timelineSlice (extended)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('addClip edge cases', () => {
    it('should not crash when adding a clip referencing a nonexistent track', () => {
      store.getState().timeline.loadProject(makeProject());
      // No tracks added, but the trackId references a nonexistent track
      const clipId = store.getState().timeline.addClip(makeClip({ trackId: 'nonexistent-track' }));
      // The clip is added to the clips map, but won't appear in any track's clips array
      expect(store.getState().timeline.project?.clips[clipId]).toBeTruthy();
      expect(store.getState().timeline.project?.tracks).toHaveLength(0);
    });

    it('should return an id even when no project is loaded (noop set)', () => {
      // addClip generates an id before the set() call, so it always returns an id
      const clipId = store.getState().timeline.addClip(makeClip());
      expect(clipId).toBeTruthy();
      // But the project is still null
      expect(store.getState().timeline.project).toBeNull();
    });
  });

  describe('deleteClip edge cases', () => {
    it('should be a no-op when removing a nonexistent clip', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      store.getState().timeline.addClip(makeClip({ trackId }));

      // Delete a clip that doesn't exist
      store.getState().timeline.deleteClip('nonexistent-clip');
      // Original clip should still be there
      expect(Object.keys(store.getState().timeline.project!.clips)).toHaveLength(1);
    });

    it('should remove clip from selection when deleted', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));

      store.getState().timeline.selectClips([clipId]);
      expect(store.getState().timeline.selection.selectedClipIds).toContain(clipId);

      store.getState().timeline.deleteClip(clipId);
      expect(store.getState().timeline.selection.selectedClipIds).not.toContain(clipId);
    });
  });

  describe('moveClip edge cases', () => {
    it('should clamp startTime to 0 when moving to a negative time', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 1000 }));

      store.getState().timeline.moveClip(clipId, trackId, -500);
      expect(store.getState().timeline.project?.clips[clipId].startTime).toBe(0);
    });

    it('should allow moving clip beyond project duration (no clamping on end)', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 0, duration: 5000 }));

      // Move to beyond the 60s duration
      store.getState().timeline.moveClip(clipId, trackId, 70000);
      expect(store.getState().timeline.project?.clips[clipId].startTime).toBe(70000);
    });

    it('should handle moving a nonexistent clip gracefully', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });

      // Should not throw
      expect(() => store.getState().timeline.moveClip('nonexistent', trackId, 0)).not.toThrow();
    });
  });

  describe('track reorder', () => {
    it('should reorder tracks according to the provided id array', () => {
      store.getState().timeline.loadProject(makeProject());
      const t1 = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const t2 = store.getState().timeline.addTrack({ type: 'audio', name: 'A1', height: 40, locked: false, muted: false, solo: false, visible: true });
      const t3 = store.getState().timeline.addTrack({ type: 'text', name: 'T1', height: 30, locked: false, muted: false, solo: false, visible: true });

      store.getState().timeline.reorderTracks([t3, t1, t2]);

      const tracks = store.getState().timeline.project!.tracks;
      expect(tracks[0].id).toBe(t3);
      expect(tracks[0].order).toBe(0);
      expect(tracks[1].id).toBe(t1);
      expect(tracks[1].order).toBe(1);
      expect(tracks[2].id).toBe(t2);
      expect(tracks[2].order).toBe(2);
    });

    it('should filter out unknown track ids during reorder', () => {
      store.getState().timeline.loadProject(makeProject());
      const t1 = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });

      store.getState().timeline.reorderTracks([t1, 'unknown-id']);
      expect(store.getState().timeline.project!.tracks).toHaveLength(1);
      expect(store.getState().timeline.project!.tracks[0].id).toBe(t1);
    });
  });

  describe('marker CRUD', () => {
    beforeEach(() => {
      store.getState().timeline.loadProject(makeProject());
    });

    it('should update a marker and re-sort by time', () => {
      const m1 = store.getState().timeline.addMarker({ time: 1000, name: 'Early', color: '#f00', type: 'chapter' });
      store.getState().timeline.addMarker({ time: 5000, name: 'Late', color: '#0f0', type: 'comment' });

      store.getState().timeline.updateMarker(m1, { time: 10000 });

      const markers = store.getState().timeline.project!.markers;
      // Now m1 (time 10000) should be after the second marker (time 5000)
      expect(markers[0].name).toBe('Late');
      expect(markers[1].name).toBe('Early');
      expect(markers[1].time).toBe(10000);
    });

    it('should handle deleting a marker that does not exist', () => {
      store.getState().timeline.addMarker({ time: 1000, name: 'M1', color: '#fff', type: 'todo' });
      store.getState().timeline.deleteMarker('nonexistent');
      expect(store.getState().timeline.project!.markers).toHaveLength(1);
    });

    it('should support all marker types', () => {
      store.getState().timeline.addMarker({ time: 100, name: 'Chapter', color: '#f00', type: 'chapter' });
      store.getState().timeline.addMarker({ time: 200, name: 'Comment', color: '#0f0', type: 'comment' });
      store.getState().timeline.addMarker({ time: 300, name: 'Todo', color: '#00f', type: 'todo' });
      store.getState().timeline.addMarker({ time: 400, name: 'Sync', color: '#ff0', type: 'sync' });

      expect(store.getState().timeline.project!.markers).toHaveLength(4);
    });
  });

  describe('zoom and viewport', () => {
    it('zoomToFit should calculate zoom from project duration', () => {
      store.getState().timeline.loadProject(makeProject());

      // Mock window.innerWidth for the calculation
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });

      store.getState().timeline.zoomToFit();
      const zoom = store.getState().timeline.view.zoom;
      // zoom = (1920 - 200 - 100) / 60000 * 1000 = 1620/60 = 27
      expect(zoom).toBeCloseTo(27, 0);
    });

    it('zoomToFit should be no-op without a project', () => {
      store.getState().timeline.zoomToFit();
      expect(store.getState().timeline.view.zoom).toBe(100); // unchanged from initial
    });

    it('setZoom should clamp at boundaries exactly', () => {
      store.getState().timeline.setZoom(10);
      expect(store.getState().timeline.view.zoom).toBe(10);

      store.getState().timeline.setZoom(500);
      expect(store.getState().timeline.view.zoom).toBe(500);

      store.getState().timeline.setZoom(9);
      expect(store.getState().timeline.view.zoom).toBe(10);

      store.getState().timeline.setZoom(501);
      expect(store.getState().timeline.view.zoom).toBe(500);
    });

    it('scroll should allow large positive values', () => {
      store.getState().timeline.scroll(99999, 99999);
      expect(store.getState().timeline.view.scrollX).toBe(99999);
      expect(store.getState().timeline.view.scrollY).toBe(99999);
    });
  });

  describe('multi-select and deselect', () => {
    it('selectTracks additive should append new ids', () => {
      store.getState().timeline.selectTracks(['t1']);
      store.getState().timeline.selectTracks(['t2', 't3'], true);
      expect(store.getState().timeline.selection.selectedTrackIds).toEqual(['t1', 't2', 't3']);
    });

    it('selectTracks additive should not duplicate already selected ids', () => {
      store.getState().timeline.selectTracks(['t1', 't2']);
      store.getState().timeline.selectTracks(['t2', 't3'], true);
      expect(store.getState().timeline.selection.selectedTrackIds).toEqual(['t1', 't2', 't3']);
    });

    it('selectClips non-additive should replace selection', () => {
      store.getState().timeline.selectClips(['c1', 'c2']);
      store.getState().timeline.selectClips(['c3']);
      expect(store.getState().timeline.selection.selectedClipIds).toEqual(['c3']);
    });

    it('selectRange should set range', () => {
      store.getState().timeline.selectRange(1000, 5000);
      expect(store.getState().timeline.selection.selectionRange).toEqual({ start: 1000, end: 5000 });
    });
  });

  describe('history: batch add + undo', () => {
    it('should undo back to a snapshot taken before multiple operations', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });

      // Take snapshot
      store.getState().timeline.saveSnapshot();

      // Do multiple operations
      store.getState().timeline.addClip(makeClip({ trackId, name: 'Clip A' }));
      store.getState().timeline.addClip(makeClip({ trackId, name: 'Clip B' }));
      store.getState().timeline.addClip(makeClip({ trackId, name: 'Clip C' }));

      // Undo should restore to snapshot (before the three clips)
      store.getState().timeline.undo();
      expect(Object.keys(store.getState().timeline.project!.clips)).toHaveLength(0);
    });

    it('saveSnapshot should limit history to 50 entries', () => {
      store.getState().timeline.loadProject(makeProject());
      for (let i = 0; i < 55; i++) {
        store.getState().timeline.saveSnapshot();
      }
      expect(store.getState().timeline.history.past.length).toBeLessThanOrEqual(50);
    });

    it('saveSnapshot should clear redo stack', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.saveSnapshot();
      store.getState().timeline.updateProject({ name: 'V2' });

      store.getState().timeline.undo();
      expect(store.getState().timeline.history.future).toHaveLength(1);

      store.getState().timeline.saveSnapshot();
      expect(store.getState().timeline.history.future).toHaveLength(0);
    });

    it('undo should be no-op when history is empty', () => {
      store.getState().timeline.loadProject(makeProject());
      const nameBefore = store.getState().timeline.project!.name;
      store.getState().timeline.undo();
      expect(store.getState().timeline.project!.name).toBe(nameBefore);
    });

    it('redo should be no-op when future is empty', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.redo();
      expect(store.getState().timeline.project!.name).toBe('Extended Test Timeline');
    });
  });

  describe('splitClip', () => {
    it('should split a clip into two parts at the given time', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 1000, duration: 4000 }));

      store.getState().timeline.splitClip(clipId, 3000);

      const clips = Object.values(store.getState().timeline.project!.clips);
      expect(clips).toHaveLength(2);

      const original = clips.find((c) => c.id === clipId)!;
      const newClip = clips.find((c) => c.id !== clipId)!;

      expect(original.duration).toBe(2000); // 3000 - 1000
      expect(newClip.startTime).toBe(3000);
      expect(newClip.duration).toBe(2000); // 4000 - 2000
    });

    it('should not split if time is at clip start', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 1000, duration: 4000 }));

      store.getState().timeline.splitClip(clipId, 1000); // splitPoint = 0, so no split
      expect(Object.keys(store.getState().timeline.project!.clips)).toHaveLength(1);
    });

    it('should not split if time is at clip end', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 1000, duration: 4000 }));

      store.getState().timeline.splitClip(clipId, 5000); // splitPoint = 4000 = duration, so no split
      expect(Object.keys(store.getState().timeline.project!.clips)).toHaveLength(1);
    });
  });

  describe('clipboard: cut and paste', () => {
    it('cut should copy to clipboard and delete selected clips', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));

      store.getState().timeline.selectClips([clipId]);
      store.getState().timeline.cut();

      expect(store.getState().timeline.clipboard).toHaveLength(1);
      expect(store.getState().timeline.project?.clips[clipId]).toBeUndefined();
    });

    it('paste should offset clips relative to earliest start time', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const c1 = store.getState().timeline.addClip(makeClip({ trackId, startTime: 2000, duration: 1000 }));
      const c2 = store.getState().timeline.addClip(makeClip({ trackId, startTime: 5000, duration: 1000 }));

      store.getState().timeline.selectClips([c1, c2]);
      store.getState().timeline.copy();
      store.getState().timeline.paste(10000);

      const allClips = Object.values(store.getState().timeline.project!.clips);
      // Original 2 + pasted 2 = 4
      expect(allClips).toHaveLength(4);

      // Pasted clips: earliest was 2000, offset is 10000
      // c1 paste: 10000 + (2000 - 2000) = 10000
      // c2 paste: 10000 + (5000 - 2000) = 13000
      const pasted = allClips.filter((c) => c.id !== c1 && c.id !== c2);
      const startTimes = pasted.map((c) => c.startTime).sort((a, b) => a - b);
      expect(startTimes).toEqual([10000, 13000]);
    });
  });
});
