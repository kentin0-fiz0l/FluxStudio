import type { Song, PlaybackMode } from '../../contexts/metmap/types';
import { AudioTrackPanel } from '../../components/metmap/AudioTrackPanel';
import { AudioTrackMixer } from '../../components/metmap/AudioTrackMixer';

interface MetMapAudioRegionProps {
  isMobile: boolean;
  song: Song;
  playbackMode: PlaybackMode;
  beatDetectionLoading: boolean;
  audioLoading: boolean;
  audioError: string | null;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onUploadAudio: (file: File) => void;
  onRemoveAudio: () => void;
  onDetectBeats: () => void;
  onAlignBpm: () => void;
}

export function MetMapAudioRegion({
  isMobile,
  song,
  playbackMode,
  beatDetectionLoading,
  audioLoading,
  audioError,
  onPlaybackModeChange,
  onUploadAudio,
  onRemoveAudio,
  onDetectBeats,
  onAlignBpm,
}: MetMapAudioRegionProps) {
  return (
    <div className={`px-4 py-2 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
      <AudioTrackMixer
        song={song}
        playbackMode={playbackMode}
        onPlaybackModeChange={onPlaybackModeChange}
      />
      {/* Legacy single-track for songs with existing audio attachment */}
      {song.audioFileUrl && (
        <AudioTrackPanel
          song={song}
          playbackMode={playbackMode}
          beatDetectionLoading={beatDetectionLoading}
          audioLoading={audioLoading}
          audioError={audioError}
          onUploadAudio={onUploadAudio}
          onRemoveAudio={onRemoveAudio}
          onDetectBeats={onDetectBeats}
          onAlignBpm={onAlignBpm}
          onPlaybackModeChange={onPlaybackModeChange}
          className="mt-2"
        />
      )}
    </div>
  );
}
