import { Keyframe, PlaybackState, AudioTrack } from '../../services/formationService';
import type { DrillSettings } from '../../services/formationTypes';
import { timeToCount } from '../../utils/drillGeometry';

export interface TimelineProps {
  keyframes: Keyframe[];
  duration: number; // Total duration in milliseconds
  currentTime: number;
  playbackState: PlaybackState;
  selectedKeyframeId?: string;
  audioTrack?: AudioTrack | null;
  drillSettings?: DrillSettings;
  timeDisplayMode?: 'time' | 'counts';
  snapResolution?: 'beat' | 'half-beat' | 'measure';
  onSnapResolutionChange?: (resolution: 'beat' | 'half-beat' | 'measure') => void;
  onDrillSettingsChange?: (settings: DrillSettings) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onKeyframeSelect: (keyframeId: string) => void;
  onKeyframeAdd: (timestamp: number) => void;
  onKeyframeRemove: (keyframeId: string) => void;
  onKeyframeMove: (keyframeId: string, timestamp: number) => void;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export function formatCount(ms: number, settings: DrillSettings): string {
  const countSettings = { bpm: settings.bpm, countsPerPhrase: settings.countsPerPhrase, startOffset: settings.startOffset };
  const count = timeToCount(ms, countSettings);
  const phrase = Math.ceil(count / settings.countsPerPhrase);
  const beatInPhrase = ((count - 1) % settings.countsPerPhrase) + 1;
  return `Count ${count} (Set ${phrase}, Beat ${beatInPhrase})`;
}
