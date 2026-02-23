/**
 * PlaybackControls - Timeline playback control bar
 *
 * Play, pause, stop, and navigation controls.
 */

import * as React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayback, useTimelineProject } from '@/store';

interface PlaybackControlsProps {
  className?: string;
}

export function PlaybackControls({ className = '' }: PlaybackControlsProps) {
  const playback = usePlayback();
  const project = useTimelineProject();
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  const handlePlayPause = () => {
    if (playback.isPlaying) {
      playback.pause();
    } else {
      playback.play();
    }
  };

  const handleStop = () => {
    playback.stop();
  };

  const handleSkipBack = () => {
    if (!project) return;

    // Skip to previous marker or start
    const markers = project.markers.filter((m) => m.time < playback.currentTime - 100);
    if (markers.length > 0) {
      playback.seek(markers[markers.length - 1].time);
    } else {
      playback.seek(0);
    }
  };

  const handleSkipForward = () => {
    if (!project) return;

    // Skip to next marker or end
    const markers = project.markers.filter((m) => m.time > playback.currentTime + 100);
    if (markers.length > 0) {
      playback.seek(markers[0].time);
    } else {
      playback.seek(project.duration);
    }
  };

  const handleFrameBack = () => {
    if (!project) return;
    const frameMs = 1000 / project.frameRate;
    playback.seek(Math.max(0, playback.currentTime - frameMs));
  };

  const handleFrameForward = () => {
    if (!project) return;
    const frameMs = 1000 / project.frameRate;
    playback.seek(Math.min(project.duration, playback.currentTime + frameMs));
  };

  const handleToggleLoop = () => {
    playback.toggleLoop();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    if (isMuted && parseFloat(e.target.value) > 0) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Transport controls */}
      <div className="flex items-center gap-1">
        {/* Skip to start */}
        <button
          onClick={handleSkipBack}
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Skip to Previous Marker"
        >
          <SkipBack className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Frame back */}
        <button
          onClick={handleFrameBack}
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Previous Frame"
        >
          <Rewind className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          aria-label={playback.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playback.isPlaying ? (
            <Pause className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Stop"
        >
          <Square className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Frame forward */}
        <button
          onClick={handleFrameForward}
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Next Frame"
        >
          <FastForward className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Skip to end */}
        <button
          onClick={handleSkipForward}
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Skip to Next Marker"
        >
          <SkipForward className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Loop toggle */}
      <button
        onClick={handleToggleLoop}
        className={`p-2 rounded-md transition-colors ${
          playback.loop
            ? 'bg-blue-600/20 text-blue-400'
            : 'hover:bg-gray-700 text-gray-400'
        }`}
        aria-label="Toggle Loop"
        aria-pressed={playback.loop}
      >
        <Repeat className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Playback rate */}
      <select
        value={playback.playbackRate}
        onChange={(e) => playback.setPlaybackRate(parseFloat(e.target.value))}
        className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Playback Speed"
      >
        {playbackRates.map((rate) => (
          <option key={rate} value={rate}>
            {rate}x
          </option>
        ))}
      </select>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleMute}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-gray-400" aria-hidden="true" />
          ) : (
            <Volume2 className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          aria-label={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>
    </div>
  );
}

export default PlaybackControls;
