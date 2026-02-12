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
  id: 'tl-1',
  name: 'Test Timeline',
  duration: 60000, // 60s
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

describe('timelineSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('initial state', () => {
    it('should have null project and default playback', () => {
      const { timeline } = store.getState();
      expect(timeline.project).toBeNull();
      expect(timeline.playback.isPlaying).toBe(false);
      expect(timeline.playback.currentTime).toBe(0);
      expect(timeline.view.zoom).toBe(100);
    });
  });

  describe('project actions', () => {
    it('loadProject should set project and reset state', () => {
      const proj = makeProject();
      store.getState().timeline.loadProject(proj);
      expect(store.getState().timeline.project?.id).toBe('tl-1');
      expect(store.getState().timeline.playback.loopEnd).toBe(60000);
    });

    it('updateProject should merge updates', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.updateProject({ name: 'Updated' });
      expect(store.getState().timeline.project?.name).toBe('Updated');
    });

    it('clearProject should reset everything', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.clearProject();
      expect(store.getState().timeline.project).toBeNull();
    });
  });

  describe('playback', () => {
    it('play/pause/stop should update state', () => {
      store.getState().timeline.loadProject(makeProject());

      store.getState().timeline.play();
      expect(store.getState().timeline.playback.isPlaying).toBe(true);

      store.getState().timeline.pause();
      expect(store.getState().timeline.playback.isPlaying).toBe(false);

      store.getState().timeline.play();
      store.getState().timeline.seek(5000);
      store.getState().timeline.stop();
      expect(store.getState().timeline.playback.isPlaying).toBe(false);
      expect(store.getState().timeline.playback.currentTime).toBe(0);
    });

    it('seek should clamp to project duration', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.seek(999999);
      expect(store.getState().timeline.playback.currentTime).toBe(60000);

      store.getState().timeline.seek(-100);
      expect(store.getState().timeline.playback.currentTime).toBe(0);
    });

    it('setPlaybackRate should clamp between 0.1 and 4', () => {
      store.getState().timeline.setPlaybackRate(0.01);
      expect(store.getState().timeline.playback.playbackRate).toBe(0.1);

      store.getState().timeline.setPlaybackRate(10);
      expect(store.getState().timeline.playback.playbackRate).toBe(4);
    });

    it('toggleLoop should flip loop state', () => {
      store.getState().timeline.toggleLoop();
      expect(store.getState().timeline.playback.loop).toBe(true);
    });
  });

  describe('view', () => {
    it('setZoom should clamp between 10 and 500', () => {
      store.getState().timeline.setZoom(5);
      expect(store.getState().timeline.view.zoom).toBe(10);

      store.getState().timeline.setZoom(600);
      expect(store.getState().timeline.view.zoom).toBe(500);
    });

    it('zoomIn/zoomOut should scale by 1.2x', () => {
      store.getState().timeline.zoomIn();
      expect(store.getState().timeline.view.zoom).toBe(120);

      store.getState().timeline.setZoom(100);
      store.getState().timeline.zoomOut();
      expect(store.getState().timeline.view.zoom).toBeCloseTo(100 / 1.2);
    });

    it('scroll should not go below 0', () => {
      store.getState().timeline.scroll(-10, -20);
      expect(store.getState().timeline.view.scrollX).toBe(0);
      expect(store.getState().timeline.view.scrollY).toBe(0);
    });
  });

  describe('tracks', () => {
    it('addTrack should create track with order', () => {
      store.getState().timeline.loadProject(makeProject());
      const id = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      expect(id).toBeTruthy();
      expect(store.getState().timeline.project?.tracks).toHaveLength(1);
      expect(store.getState().timeline.project?.tracks[0].order).toBe(0);
    });

    it('deleteTrack should remove track and its clips', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      store.getState().timeline.addClip(makeClip({ trackId }));

      store.getState().timeline.deleteTrack(trackId);
      expect(store.getState().timeline.project?.tracks).toHaveLength(0);
    });
  });

  describe('clips', () => {
    let trackId: string;

    beforeEach(() => {
      store.getState().timeline.loadProject(makeProject());
      trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
    });

    it('addClip should add clip and reference in track', () => {
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));
      expect(store.getState().timeline.project?.clips[clipId]).toBeTruthy();
      expect(store.getState().timeline.project?.tracks[0].clips).toContain(clipId);
    });

    it('deleteClip should remove clip and track reference', () => {
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));
      store.getState().timeline.deleteClip(clipId);
      expect(store.getState().timeline.project?.clips[clipId]).toBeUndefined();
      expect(store.getState().timeline.project?.tracks[0].clips).not.toContain(clipId);
    });

    it('moveClip should change track and startTime', () => {
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));
      const track2 = store.getState().timeline.addTrack({ type: 'audio', name: 'A1', height: 40, locked: false, muted: false, solo: false, visible: true });

      store.getState().timeline.moveClip(clipId, track2, 3000);

      expect(store.getState().timeline.project?.clips[clipId].trackId).toBe(track2);
      expect(store.getState().timeline.project?.clips[clipId].startTime).toBe(3000);
      expect(store.getState().timeline.project?.tracks[0].clips).not.toContain(clipId);
      expect(store.getState().timeline.project?.tracks[1].clips).toContain(clipId);
    });

    it('trimClip should adjust start and duration', () => {
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 1000, duration: 5000 }));
      store.getState().timeline.trimClip(clipId, 500, 1000);

      const clip = store.getState().timeline.project?.clips[clipId];
      expect(clip?.startTime).toBe(1500);
      expect(clip?.duration).toBe(5500); // 5000 - 500 + 1000
    });

    it('duplicateClip should create a copy after original', () => {
      const clipId = store.getState().timeline.addClip(makeClip({ trackId, startTime: 0, duration: 5000 }));
      const dupId = store.getState().timeline.duplicateClip(clipId);

      expect(dupId).toBeTruthy();
      expect(store.getState().timeline.project?.clips[dupId].startTime).toBe(5000);
    });
  });

  describe('selection', () => {
    it('selectClips should set selected clip ids', () => {
      store.getState().timeline.selectClips(['c1', 'c2']);
      expect(store.getState().timeline.selection.selectedClipIds).toEqual(['c1', 'c2']);
    });

    it('selectClips additive should append', () => {
      store.getState().timeline.selectClips(['c1']);
      store.getState().timeline.selectClips(['c2'], true);
      expect(store.getState().timeline.selection.selectedClipIds).toEqual(['c1', 'c2']);
    });

    it('clearSelection should reset all selection state', () => {
      store.getState().timeline.selectClips(['c1']);
      store.getState().timeline.selectRange(0, 5000);
      store.getState().timeline.clearSelection();

      const sel = store.getState().timeline.selection;
      expect(sel.selectedClipIds).toEqual([]);
      expect(sel.selectionRange).toBeNull();
    });
  });

  describe('clipboard', () => {
    it('copy should store selected clips', () => {
      store.getState().timeline.loadProject(makeProject());
      const trackId = store.getState().timeline.addTrack({ type: 'video', name: 'V1', height: 60, locked: false, muted: false, solo: false, visible: true });
      const clipId = store.getState().timeline.addClip(makeClip({ trackId }));

      store.getState().timeline.selectClips([clipId]);
      store.getState().timeline.copy();
      expect(store.getState().timeline.clipboard).toHaveLength(1);
    });
  });

  describe('history', () => {
    it('saveSnapshot should push to past and clear future', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.saveSnapshot();
      expect(store.getState().timeline.history.past).toHaveLength(1);
    });

    it('undo/redo should move through history', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.saveSnapshot();
      store.getState().timeline.updateProject({ name: 'V2' });

      store.getState().timeline.undo();
      expect(store.getState().timeline.project?.name).toBe('Test Timeline');

      store.getState().timeline.redo();
      expect(store.getState().timeline.project?.name).toBe('V2');
    });
  });

  describe('markers', () => {
    it('addMarker should add sorted by time', () => {
      store.getState().timeline.loadProject(makeProject());
      store.getState().timeline.addMarker({ time: 5000, name: 'B', color: '#fff', type: 'chapter' });
      store.getState().timeline.addMarker({ time: 1000, name: 'A', color: '#fff', type: 'chapter' });

      const markers = store.getState().timeline.project?.markers;
      expect(markers?.[0].name).toBe('A');
      expect(markers?.[1].name).toBe('B');
    });

    it('deleteMarker should remove', () => {
      store.getState().timeline.loadProject(makeProject());
      const id = store.getState().timeline.addMarker({ time: 1000, name: 'M', color: '#000', type: 'todo' });
      store.getState().timeline.deleteMarker(id);
      expect(store.getState().timeline.project?.markers).toHaveLength(0);
    });
  });
});
