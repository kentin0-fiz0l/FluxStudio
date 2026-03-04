import { MobilePlaybackControls } from '../../components/metmap/MobilePlaybackControls';
import { PlaybackControls } from './MetMapComponents';

interface MetMapPlaybackBarProps {
  isMobile: boolean;
  playback: {
    isPlaying: boolean;
    isPaused: boolean;
    currentBar: number;
    currentBeat: number;
    currentTempo: number;
    countingOff: boolean;
    countoffBeatsRemaining: number;
  };
  totalBars: number;
  defaultTempo: number;
  tempoOverride: number | null;
  setTempoOverride: (v: number | null) => void;
  useClick: boolean;
  setUseClick: (v: boolean) => void;
  countoffBars: number;
  setCountoffBars: (v: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeekToBar: (bar: number) => void;
}

export function MetMapPlaybackBar({
  isMobile,
  playback,
  totalBars,
  defaultTempo,
  tempoOverride,
  setTempoOverride,
  useClick,
  setUseClick,
  countoffBars,
  setCountoffBars,
  onPlay,
  onPause,
  onStop,
  onSeekToBar,
}: MetMapPlaybackBarProps) {
  return (
    <div className={`p-3 sm:p-4 border-t border-gray-200 bg-white ${isMobile ? 'sticky bottom-0 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]' : ''}`}>
      {isMobile ? (
        <MobilePlaybackControls
          isPlaying={playback.isPlaying}
          isPaused={playback.isPaused}
          currentBar={playback.currentBar}
          currentBeat={playback.currentBeat}
          currentTempo={playback.currentTempo}
          totalBars={totalBars}
          countingOff={playback.countingOff}
          countoffBeatsRemaining={playback.countoffBeatsRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onSeekToBar={onSeekToBar}
          defaultTempo={defaultTempo}
        />
      ) : (
        <PlaybackControls
          isPlaying={playback.isPlaying}
          isPaused={playback.isPaused}
          currentBar={playback.currentBar}
          currentBeat={playback.currentBeat}
          currentTempo={playback.currentTempo}
          countingOff={playback.countingOff}
          countoffBeatsRemaining={playback.countoffBeatsRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          tempoOverride={tempoOverride}
          setTempoOverride={setTempoOverride}
          useClick={useClick}
          setUseClick={setUseClick}
          countoffBars={countoffBars}
          setCountoffBars={setCountoffBars}
        />
      )}
    </div>
  );
}
