/**
 * SecureVideoPlayer Component
 *
 * Advanced video player with HLS adaptive streaming and FairPlay DRM support
 *
 * Features:
 * - HLS.js for adaptive bitrate streaming
 * - FairPlay Streaming DRM on iOS/macOS/tvOS
 * - Quality selector (auto, 1080p, 720p, 480p)
 * - All controls from base VideoPlayer
 * - DRM status indicator
 * - License acquisition handling
 *
 * Usage:
 * <SecureVideoPlayer
 *   fileId="uuid"
 *   hlsUrl="https://cdn.fluxstudio.art/hls/uuid/master.m3u8"
 *   drmProtected={true}
 *   poster="https://cdn.fluxstudio.art/thumbnails/uuid.jpg"
 * />
 */

import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';

// WebKit vendor-specific API type declarations for FairPlay DRM
declare global {
  interface Window {
    WebKitMediaKeys?: any;
  }
  interface HTMLVideoElement {
    webkitKeys?: any;
  }
}
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Shield,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface SecureVideoPlayerProps {
  fileId: string;
  hlsUrl?: string;  // HLS manifest URL (m3u8)
  fallbackUrl?: string;  // Fallback direct video URL for non-HLS browsers
  drmProtected?: boolean;
  poster?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onError?: (error: Error) => void;
}

interface QualityLevel {
  height: number;
  bitrate: number;
  label: string;
}

export function SecureVideoPlayer({
  fileId,
  hlsUrl,
  fallbackUrl,
  drmProtected = false,
  poster,
  className,
  onTimeUpdate,
  onLoadedMetadata,
  onError,
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { token } = useAuth();

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // HLS/DRM state
  const [hlsSupported, setHlsSupported] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [drmStatus, setDrmStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [drmError, setDrmError] = useState<string | null>(null);

  // Initialize HLS.js or native HLS support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Check for native HLS support (Safari)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl');

    if (canPlayHLS) {
      // Native HLS support (iOS/macOS Safari)
      setHlsSupported(true);
      video.src = hlsUrl;

      // Set up FairPlay if DRM protected
      if (drmProtected) {
        setupFairPlay(video);
      }

    } else if (Hls.isSupported()) {
      // HLS.js for browsers without native support
      setHlsSupported(true);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      // HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log('[HLS] Manifest loaded:', data.levels.length, 'quality levels');

        const levels: QualityLevel[] = data.levels.map((level) => ({
          height: level.height,
          bitrate: level.bitrate,
          label: getLevelLabel(level.height),
        }));

        setQualityLevels(levels);
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        console.log('[HLS] Quality switched to:', data.level);
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[HLS] Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[HLS] Fatal network error, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[HLS] Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal error, cannot recover');
              setDrmStatus('error');
              setDrmError('Playback error occurred');
              onError?.(new Error(data.details));
              break;
          }
        }
      });

      // Note: HLS.js doesn't support FairPlay directly
      // FairPlay only works with native Safari implementation
      if (drmProtected) {
        console.warn('[HLS] FairPlay DRM requires Safari browser. This content may not play.');
        setDrmStatus('error');
        setDrmError('FairPlay DRM requires Safari on iOS/macOS');
      }

    } else {
      // No HLS support, use fallback
      setHlsSupported(false);
      if (fallbackUrl) {
        video.src = fallbackUrl;
      } else {
        setDrmStatus('error');
        setDrmError('HLS not supported in this browser');
        onError?.(new Error('HLS not supported'));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, fallbackUrl, drmProtected, onError]);

  // Set up FairPlay DRM (Safari only)
  const setupFairPlay = (video: HTMLVideoElement) => {
    if (!window.WebKitMediaKeys) {
      console.error('[FairPlay] WebKit Media Keys not available');
      setDrmStatus('error');
      setDrmError('FairPlay not supported');
      return;
    }

    setDrmStatus('loading');

    // FairPlay license server URL
    const licenseServerUrl = `${window.location.origin}/fps/license?contentId=${fileId}`;

    // Set up media keys
    try {
      video.addEventListener('webkitneedkey', async (event: any) => {
        console.log('[FairPlay] Need key event triggered');

        const contentId = fileId;
        const initData = event.initData;

        try {
          // Create key session
          const keySession = video.webkitKeys.createSession('video/mp4', initData);

          if (!keySession) {
            throw new Error('Failed to create key session');
          }

          keySession.addEventListener('webkitkeymessage', async (messageEvent: any) => {
            console.log('[FairPlay] Key message received');

            try {
              // Request license from server
              const response = await fetch(licenseServerUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  'Authorization': `Bearer ${token}`,
                },
                body: messageEvent.message,
              });

              if (!response.ok) {
                throw new Error(`License request failed: ${response.statusText}`);
              }

              const license = await response.arrayBuffer();

              // Update key session with license
              keySession.update(new Uint8Array(license));

              setDrmStatus('active');
              console.log('[FairPlay] License acquired successfully');

            } catch (error) {
              console.error('[FairPlay] License acquisition failed:', error);
              setDrmStatus('error');
              setDrmError('Failed to acquire playback license');
              onError?.(error as Error);
            }
          });

          keySession.addEventListener('webkitkeyadded', () => {
            console.log('[FairPlay] Key added successfully');
          });

          keySession.addEventListener('webkitkeyerror', (errorEvent: any) => {
            console.error('[FairPlay] Key error:', errorEvent);
            setDrmStatus('error');
            setDrmError('DRM key error');
          });

        } catch (error) {
          console.error('[FairPlay] Key session creation failed:', error);
          setDrmStatus('error');
          setDrmError('DRM initialization failed');
          onError?.(error as Error);
        }
      });

    } catch (error) {
      console.error('[FairPlay] Setup failed:', error);
      setDrmStatus('error');
      setDrmError('FairPlay setup failed');
      onError?.(error as Error);
    }
  };

  // Helper function to get quality label
  const getLevelLabel = (height: number): string => {
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return `${height}p`;
  };

  // Change quality level
  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      setShowQualityMenu(false);
    }
  };

  // Standard video controls (same as VideoPlayer)
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Standard video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      onLoadedMetadata?.(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onLoadedMetadata]);

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black rounded-lg overflow-hidden group', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        </div>
      )}

      {/* DRM Status Badge */}
      {drmProtected && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-2 rounded-lg">
          {drmStatus === 'active' && (
            <>
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Protected</span>
            </>
          )}
          {drmStatus === 'loading' && (
            <>
              <Shield className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-400 font-medium">Activating DRM...</span>
            </>
          )}
          {drmStatus === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-medium">{drmError || 'DRM Error'}</span>
            </>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-4"
        />

        {/* Control buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Skip buttons */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10)}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Time */}
            <span className="text-sm font-medium ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality selector */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {currentQuality === -1 ? 'Auto' : qualityLevels[currentQuality]?.label}
                </Button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden">
                    <button
                      onClick={() => changeQuality(-1)}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm hover:bg-white/20',
                        currentQuality === -1 && 'bg-white/30'
                      )}
                    >
                      Auto
                    </button>
                    {qualityLevels.map((level, index) => (
                      <button
                        key={index}
                        onClick={() => changeQuality(index)}
                        className={cn(
                          'block w-full px-4 py-2 text-left text-sm hover:bg-white/20',
                          currentQuality === index && 'bg-white/30'
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
