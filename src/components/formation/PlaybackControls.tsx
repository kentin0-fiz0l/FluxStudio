import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Minus,
  Repeat,
  Clock,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { PlaybackState, AudioTrack } from '../../services/formationService';
import type { DrillSettings } from '../../services/formationTypes';
import { formatTime, formatCount } from './timelineHelpers';

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  audioTrack?: AudioTrack | null;
  audioState: { isLoaded: boolean; volume: number };
  drillSettings?: DrillSettings;
  isCountMode: boolean;
  zoom: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onKeyframeAdd: (timestamp: number) => void;
  onZoomChange: (zoom: number) => void;
  onVolumeChange: (volume: number) => void;
  onDrillSettingsChange?: (settings: DrillSettings) => void;
}

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlaybackControls({
  playbackState,
  currentTime,
  duration,
  audioTrack,
  audioState,
  drillSettings,
  isCountMode,
  zoom,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onToggleLoop,
  onKeyframeAdd,
  onZoomChange,
  onVolumeChange,
  onDrillSettingsChange,
}: PlaybackControlsProps) {
  const { t } = useTranslation('common');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showBpmInput, setShowBpmInput] = useState(false);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {/* Stop/Reset */}
        <button
          onClick={onStop}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('formation.stop', 'Stop')}
        >
          <SkipBack className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={playbackState.isPlaying ? onPause : onPlay}
          className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
          aria-label={playbackState.isPlaying ? t('formation.pause', 'Pause') : t('formation.play', 'Play')}
        >
          {playbackState.isPlaying ? (
            <Pause className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Skip to End */}
        <button
          onClick={() => onSeek(duration)}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('formation.skipToEnd', 'Skip to end')}
        >
          <SkipForward className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Loop Toggle */}
        <button
          onClick={onToggleLoop}
          className={`p-2 rounded-lg ${
            playbackState.loop
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          aria-label={t('formation.loop', 'Loop')}
          aria-pressed={playbackState.loop}
        >
          <Repeat className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Audio indicator and volume control */}
        {audioTrack && (
          <div className="relative flex items-center gap-1 ml-2">
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className={`p-2 rounded-lg ${
                audioState.isLoaded
                  ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  : 'text-gray-400'
              }`}
              aria-label={t('formation.audioVolume', 'Audio Volume')}
            >
              {audioState.volume === 0 ? (
                <VolumeX className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Volume2 className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Volume slider popup */}
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="flex items-center gap-3">
                  <Music className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioState.volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-500 min-w-[2rem]">
                    {Math.round(audioState.volume * 100)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 truncate max-w-[150px]">
                  {audioTrack.filename}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span className="font-mono text-gray-700 dark:text-gray-300">
          {isCountMode && drillSettings
            ? formatCount(currentTime, drillSettings)
            : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </span>
      </div>

      {/* Speed Control */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('formation.speed', 'Speed')}:
        </span>
        <select
          value={playbackState.speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
        >
          {speedOptions.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>

        {/* Detected BPM from audio */}
        {audioTrack?.bpm && audioTrack.bpm > 0 && (
          <div className="flex items-center gap-1 ml-1">
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
            <span
              className="px-2 py-0.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded"
              title={`Detected BPM: ${audioTrack.bpm} (confidence: ${Math.round((audioTrack.bpmConfidence ?? 0) * 100)}%)`}
            >
              {audioTrack.bpm} BPM
            </span>
          </div>
        )}

        {/* BPM Input (visible in count mode) */}
        {isCountMode && drillSettings && (
          <div className="relative flex items-center gap-1 ml-1">
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
            <button
              onClick={() => setShowBpmInput(!showBpmInput)}
              className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              {drillSettings.bpm} BPM
            </button>
            {showBpmInput && onDrillSettingsChange && (
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[180px]">
                <label className="block text-xs text-gray-500 mb-1">BPM</label>
                <input
                  type="number"
                  min={40}
                  max={300}
                  value={drillSettings.bpm}
                  onChange={(e) => onDrillSettingsChange({ ...drillSettings, bpm: Math.max(40, Math.min(300, Number(e.target.value))) })}
                  className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <label className="block text-xs text-gray-500 mt-2 mb-1">Counts per Phrase</label>
                <select
                  value={drillSettings.countsPerPhrase}
                  onChange={(e) => onDrillSettingsChange({ ...drillSettings, countsPerPhrase: Number(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                >
                  {[4, 6, 8, 12, 16].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('formation.zoomOut', 'Zoom out')}
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('formation.zoomIn', 'Zoom in')}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Add Keyframe */}
      <button
        onClick={() => onKeyframeAdd(currentTime)}
        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
        aria-label={t('formation.addKeyframe', 'Add keyframe at current time')}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        {t('formation.keyframe', 'Keyframe')}
      </button>
    </div>
  );
}
