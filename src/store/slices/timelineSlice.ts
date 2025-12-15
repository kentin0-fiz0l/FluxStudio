/**
 * Timeline Slice - Visual Timeline Editor state
 *
 * Handles:
 * - Timeline tracks and clips
 * - Playhead position
 * - Selection state
 * - Zoom and scroll
 * - Keyframes and automation
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type TrackType = 'video' | 'audio' | 'text' | 'effect' | 'marker';
export type ClipType = 'media' | 'text' | 'shape' | 'transition' | 'effect';

export interface Keyframe {
  id: string;
  time: number; // in milliseconds
  value: number | string | Record<string, unknown>;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierHandles?: { x1: number; y1: number; x2: number; y2: number };
}

export interface Animation {
  id: string;
  property: string;
  keyframes: Keyframe[];
  enabled: boolean;
}

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  startTime: number; // in milliseconds
  duration: number;
  sourceStart?: number; // for trimmed media
  sourceDuration?: number;
  sourceUrl?: string;
  thumbnail?: string;
  color?: string;
  locked: boolean;
  muted: boolean;
  animations: Animation[];
  properties: Record<string, unknown>;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  order: number;
  height: number;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  visible: boolean;
  color?: string;
  clips: string[]; // clip IDs
}

export interface Marker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'chapter' | 'comment' | 'todo' | 'sync';
}

export interface TimelineProject {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  tracks: Track[];
  clips: Record<string, Clip>;
  markers: Marker[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
}

export interface ViewState {
  zoom: number; // pixels per second
  scrollX: number;
  scrollY: number;
  trackPanelWidth: number;
  timelineHeight: number;
}

export interface SelectionState {
  selectedClipIds: string[];
  selectedTrackIds: string[];
  selectedKeyframeIds: string[];
  selectionRange: { start: number; end: number } | null;
}

export interface TimelineState {
  project: TimelineProject | null;
  playback: PlaybackState;
  view: ViewState;
  selection: SelectionState;
  clipboard: Clip[];
  history: {
    past: TimelineProject[];
    future: TimelineProject[];
  };
  isLoading: boolean;
  error: string | null;
}

export interface TimelineActions {
  // Project
  loadProject: (project: TimelineProject) => void;
  updateProject: (updates: Partial<TimelineProject>) => void;
  clearProject: () => void;

  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  setLoopRange: (start: number, end: number) => void;

  // View
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  scroll: (x: number, y: number) => void;

  // Tracks
  addTrack: (track: Omit<Track, 'id' | 'order' | 'clips'>) => string;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  deleteTrack: (id: string) => void;
  reorderTracks: (trackIds: string[]) => void;

  // Clips
  addClip: (clip: Omit<Clip, 'id'>) => string;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClip: (id: string) => void;
  moveClip: (id: string, trackId: string, startTime: number) => void;
  trimClip: (id: string, startDelta: number, endDelta: number) => void;
  splitClip: (id: string, time: number) => void;
  duplicateClip: (id: string) => string;

  // Selection
  selectClips: (ids: string[], additive?: boolean) => void;
  selectTracks: (ids: string[], additive?: boolean) => void;
  selectRange: (start: number, end: number) => void;
  clearSelection: () => void;

  // Clipboard
  copy: () => void;
  cut: () => void;
  paste: (time?: number) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;

  // Markers
  addMarker: (marker: Omit<Marker, 'id'>) => string;
  updateMarker: (id: string, updates: Partial<Marker>) => void;
  deleteMarker: (id: string) => void;
}

export interface TimelineSlice {
  timeline: TimelineState & TimelineActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  loop: false,
  loopStart: 0,
  loopEnd: 0,
};

const initialView: ViewState = {
  zoom: 100, // 100 pixels per second
  scrollX: 0,
  scrollY: 0,
  trackPanelWidth: 200,
  timelineHeight: 300,
};

const initialSelection: SelectionState = {
  selectedClipIds: [],
  selectedTrackIds: [],
  selectedKeyframeIds: [],
  selectionRange: null,
};

const initialState: TimelineState = {
  project: null,
  playback: initialPlayback,
  view: initialView,
  selection: initialSelection,
  clipboard: [],
  history: { past: [], future: [] },
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createTimelineSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  TimelineSlice
> = (set, get) => ({
  timeline: {
    ...initialState,

    // Project actions
    loadProject: (project) => {
      set((state) => {
        state.timeline.project = project;
        state.timeline.playback = { ...initialPlayback, loopEnd: project.duration };
        state.timeline.history = { past: [], future: [] };
        state.timeline.selection = initialSelection;
        state.timeline.error = null;
      });
    },

    updateProject: (updates) => {
      set((state) => {
        if (state.timeline.project) {
          Object.assign(state.timeline.project, updates);
          state.timeline.project.updatedAt = new Date().toISOString();
        }
      });
    },

    clearProject: () => {
      set((state) => {
        state.timeline.project = null;
        state.timeline.playback = initialPlayback;
        state.timeline.selection = initialSelection;
        state.timeline.history = { past: [], future: [] };
      });
    },

    // Playback actions
    play: () => {
      set((state) => {
        state.timeline.playback.isPlaying = true;
      });
    },

    pause: () => {
      set((state) => {
        state.timeline.playback.isPlaying = false;
      });
    },

    stop: () => {
      set((state) => {
        state.timeline.playback.isPlaying = false;
        state.timeline.playback.currentTime = 0;
      });
    },

    seek: (time) => {
      set((state) => {
        const duration = state.timeline.project?.duration || 0;
        state.timeline.playback.currentTime = Math.max(0, Math.min(time, duration));
      });
    },

    setPlaybackRate: (rate) => {
      set((state) => {
        state.timeline.playback.playbackRate = Math.max(0.1, Math.min(4, rate));
      });
    },

    toggleLoop: () => {
      set((state) => {
        state.timeline.playback.loop = !state.timeline.playback.loop;
      });
    },

    setLoopRange: (start, end) => {
      set((state) => {
        state.timeline.playback.loopStart = start;
        state.timeline.playback.loopEnd = end;
      });
    },

    // View actions
    setZoom: (zoom) => {
      set((state) => {
        state.timeline.view.zoom = Math.max(10, Math.min(500, zoom));
      });
    },

    zoomIn: () => {
      const current = get().timeline.view.zoom;
      get().timeline.setZoom(current * 1.2);
    },

    zoomOut: () => {
      const current = get().timeline.view.zoom;
      get().timeline.setZoom(current / 1.2);
    },

    zoomToFit: () => {
      const project = get().timeline.project;
      if (!project) return;

      // Calculate zoom to fit entire duration
      const availableWidth = window.innerWidth - get().timeline.view.trackPanelWidth - 100;
      const zoom = (availableWidth / project.duration) * 1000; // Convert ms to pixels
      get().timeline.setZoom(zoom);
    },

    scroll: (x, y) => {
      set((state) => {
        state.timeline.view.scrollX = Math.max(0, x);
        state.timeline.view.scrollY = Math.max(0, y);
      });
    },

    // Track actions
    addTrack: (track) => {
      const id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        if (!state.timeline.project) return;

        const order = state.timeline.project.tracks.length;
        state.timeline.project.tracks.push({
          ...track,
          id,
          order,
          clips: [],
        });
      });
      return id;
    },

    updateTrack: (id, updates) => {
      set((state) => {
        if (!state.timeline.project) return;

        const track = state.timeline.project.tracks.find((t) => t.id === id);
        if (track) {
          Object.assign(track, updates);
        }
      });
    },

    deleteTrack: (id) => {
      set((state) => {
        if (!state.timeline.project) return;

        const track = state.timeline.project.tracks.find((t) => t.id === id);
        if (track) {
          // Delete all clips in track
          track.clips.forEach((clipId) => {
            delete state.timeline.project!.clips[clipId];
          });
        }

        state.timeline.project.tracks = state.timeline.project.tracks.filter((t) => t.id !== id);

        // Reorder remaining tracks
        state.timeline.project.tracks.forEach((t, i) => {
          t.order = i;
        });
      });
    },

    reorderTracks: (trackIds) => {
      set((state) => {
        if (!state.timeline.project) return;

        const trackMap = new Map(state.timeline.project.tracks.map((t) => [t.id, t]));
        state.timeline.project.tracks = trackIds
          .map((id, i) => {
            const track = trackMap.get(id);
            if (track) {
              track.order = i;
            }
            return track;
          })
          .filter(Boolean) as Track[];
      });
    },

    // Clip actions
    addClip: (clip) => {
      const id = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        if (!state.timeline.project) return;

        state.timeline.project.clips[id] = { ...clip, id };

        const track = state.timeline.project.tracks.find((t) => t.id === clip.trackId);
        if (track) {
          track.clips.push(id);
        }
      });
      return id;
    },

    updateClip: (id, updates) => {
      set((state) => {
        if (!state.timeline.project) return;

        const clip = state.timeline.project.clips[id];
        if (clip) {
          Object.assign(clip, updates);
        }
      });
    },

    deleteClip: (id) => {
      set((state) => {
        if (!state.timeline.project) return;

        const clip = state.timeline.project.clips[id];
        if (clip) {
          const track = state.timeline.project.tracks.find((t) => t.id === clip.trackId);
          if (track) {
            track.clips = track.clips.filter((cid) => cid !== id);
          }
          delete state.timeline.project.clips[id];
        }

        state.timeline.selection.selectedClipIds = state.timeline.selection.selectedClipIds.filter(
          (cid) => cid !== id
        );
      });
    },

    moveClip: (id, trackId, startTime) => {
      set((state) => {
        if (!state.timeline.project) return;

        const clip = state.timeline.project.clips[id];
        if (!clip) return;

        // Remove from old track
        const oldTrack = state.timeline.project.tracks.find((t) => t.id === clip.trackId);
        if (oldTrack) {
          oldTrack.clips = oldTrack.clips.filter((cid) => cid !== id);
        }

        // Add to new track
        const newTrack = state.timeline.project.tracks.find((t) => t.id === trackId);
        if (newTrack) {
          newTrack.clips.push(id);
        }

        clip.trackId = trackId;
        clip.startTime = Math.max(0, startTime);
      });
    },

    trimClip: (id, startDelta, endDelta) => {
      set((state) => {
        if (!state.timeline.project) return;

        const clip = state.timeline.project.clips[id];
        if (!clip) return;

        const newStart = Math.max(0, clip.startTime + startDelta);
        const newDuration = Math.max(100, clip.duration - startDelta + endDelta);

        clip.startTime = newStart;
        clip.duration = newDuration;

        if (clip.sourceStart !== undefined) {
          clip.sourceStart = Math.max(0, clip.sourceStart + startDelta);
        }
      });
    },

    splitClip: (id, time) => {
      const project = get().timeline.project;
      if (!project) return;

      const clip = project.clips[id];
      if (!clip) return;

      const splitPoint = time - clip.startTime;
      if (splitPoint <= 0 || splitPoint >= clip.duration) return;

      // Update original clip
      get().timeline.updateClip(id, { duration: splitPoint });

      // Create new clip for second half
      get().timeline.addClip({
        ...clip,
        startTime: time,
        duration: clip.duration - splitPoint,
        sourceStart: (clip.sourceStart || 0) + splitPoint,
      });
    },

    duplicateClip: (id) => {
      const project = get().timeline.project;
      if (!project) return '';

      const clip = project.clips[id];
      if (!clip) return '';

      return get().timeline.addClip({
        ...clip,
        startTime: clip.startTime + clip.duration,
      });
    },

    // Selection actions
    selectClips: (ids, additive = false) => {
      set((state) => {
        if (additive) {
          const newIds = ids.filter((id) => !state.timeline.selection.selectedClipIds.includes(id));
          state.timeline.selection.selectedClipIds.push(...newIds);
        } else {
          state.timeline.selection.selectedClipIds = ids;
        }
      });
    },

    selectTracks: (ids, additive = false) => {
      set((state) => {
        if (additive) {
          const newIds = ids.filter((id) => !state.timeline.selection.selectedTrackIds.includes(id));
          state.timeline.selection.selectedTrackIds.push(...newIds);
        } else {
          state.timeline.selection.selectedTrackIds = ids;
        }
      });
    },

    selectRange: (start, end) => {
      set((state) => {
        state.timeline.selection.selectionRange = { start, end };
      });
    },

    clearSelection: () => {
      set((state) => {
        state.timeline.selection = initialSelection;
      });
    },

    // Clipboard actions
    copy: () => {
      const project = get().timeline.project;
      const selectedIds = get().timeline.selection.selectedClipIds;
      if (!project || selectedIds.length === 0) return;

      const clips = selectedIds.map((id) => project.clips[id]).filter(Boolean);
      set((state) => {
        state.timeline.clipboard = clips;
      });
    },

    cut: () => {
      get().timeline.copy();
      const selectedIds = get().timeline.selection.selectedClipIds;
      selectedIds.forEach((id) => get().timeline.deleteClip(id));
    },

    paste: (time) => {
      const clipboard = get().timeline.clipboard;
      const currentTime = time ?? get().timeline.playback.currentTime;
      if (clipboard.length === 0) return;

      // Find earliest clip start time
      const minStart = Math.min(...clipboard.map((c) => c.startTime));

      clipboard.forEach((clip) => {
        get().timeline.addClip({
          ...clip,
          startTime: currentTime + (clip.startTime - minStart),
        });
      });
    },

    // History actions
    undo: () => {
      set((state) => {
        if (state.timeline.history.past.length === 0) return;

        const previous = state.timeline.history.past.pop()!;
        if (state.timeline.project) {
          state.timeline.history.future.unshift(state.timeline.project);
        }
        state.timeline.project = previous;
      });
    },

    redo: () => {
      set((state) => {
        if (state.timeline.history.future.length === 0) return;

        const next = state.timeline.history.future.shift()!;
        if (state.timeline.project) {
          state.timeline.history.past.push(state.timeline.project);
        }
        state.timeline.project = next;
      });
    },

    saveSnapshot: () => {
      set((state) => {
        if (!state.timeline.project) return;

        // Deep clone current project
        const snapshot = JSON.parse(JSON.stringify(state.timeline.project));
        state.timeline.history.past.push(snapshot);

        // Limit history size
        if (state.timeline.history.past.length > 50) {
          state.timeline.history.past.shift();
        }

        // Clear redo stack on new action
        state.timeline.history.future = [];
      });
    },

    // Marker actions
    addMarker: (marker) => {
      const id = `marker-${Date.now()}`;
      set((state) => {
        if (!state.timeline.project) return;

        state.timeline.project.markers.push({ ...marker, id });
        state.timeline.project.markers.sort((a, b) => a.time - b.time);
      });
      return id;
    },

    updateMarker: (id, updates) => {
      set((state) => {
        if (!state.timeline.project) return;

        const marker = state.timeline.project.markers.find((m) => m.id === id);
        if (marker) {
          Object.assign(marker, updates);
          state.timeline.project.markers.sort((a, b) => a.time - b.time);
        }
      });
    },

    deleteMarker: (id) => {
      set((state) => {
        if (!state.timeline.project) return;

        state.timeline.project.markers = state.timeline.project.markers.filter((m) => m.id !== id);
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useTimeline = () => {
  return useStore((state) => state.timeline);
};

export const usePlayback = () => {
  const playback = useStore((state) => state.timeline.playback);
  const play = useStore((state) => state.timeline.play);
  const pause = useStore((state) => state.timeline.pause);
  const stop = useStore((state) => state.timeline.stop);
  const seek = useStore((state) => state.timeline.seek);
  const setPlaybackRate = useStore((state) => state.timeline.setPlaybackRate);
  const toggleLoop = useStore((state) => state.timeline.toggleLoop);

  return { ...playback, play, pause, stop, seek, setPlaybackRate, toggleLoop };
};

export const useTimelineProject = () => {
  return useStore((state) => state.timeline.project);
};

export const useTimelineSelection = () => {
  return useStore((state) => state.timeline.selection);
};

export const useTimelineView = () => {
  const view = useStore((state) => state.timeline.view);
  const setZoom = useStore((state) => state.timeline.setZoom);
  const zoomIn = useStore((state) => state.timeline.zoomIn);
  const zoomOut = useStore((state) => state.timeline.zoomOut);
  const scroll = useStore((state) => state.timeline.scroll);

  return { ...view, setZoom, zoomIn, zoomOut, scroll };
};

export const useClip = (clipId: string) => {
  return useStore((state) => state.timeline.project?.clips[clipId]);
};

export const useTrack = (trackId: string) => {
  return useStore((state) => state.timeline.project?.tracks.find((t) => t.id === trackId));
};
