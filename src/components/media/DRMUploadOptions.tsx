/**
 * DRMUploadOptions Component
 *
 * UI component for enabling FairPlay DRM protection during file upload
 *
 * Features:
 * - DRM toggle with subscription tier validation
 * - Transcoding options (quality presets)
 * - Automatic HLS conversion checkbox
 * - Upgrade prompt for free tier users
 * - Real-time status updates during transcoding
 *
 * Usage:
 * <DRMUploadOptions
 *   fileId="uuid"
 *   fileName="video.mp4"
 *   onTranscodingStart={(jobId) => console.log('Started:', jobId)}
 *   onTranscodingComplete={(hlsUrl) => console.log('Complete:', hlsUrl)}
 * />
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  Shield,
  ShieldCheck,
  Film,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Info,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface DRMUploadOptionsProps {
  fileId: string;
  fileName: string;
  mimeType?: string;
  onTranscodingStart?: (jobId: string) => void;
  onTranscodingComplete?: (hlsUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface SubscriptionTier {
  name: string;
  canUseDrm: boolean;
  maxConcurrentStreams: number;
}

interface TranscodingStatus {
  status: string;
  progress: number;
  hlsManifestUrl?: string;
  errorMessage?: string;
}

export function DRMUploadOptions({
  fileId,
  fileName,
  mimeType = 'video/mp4',
  onTranscodingStart,
  onTranscodingComplete,
  onError,
  className,
}: DRMUploadOptionsProps) {
  const { token } = useAuth();

  const [enableDrm, setEnableDrm] = useState(false);
  const [enableTranscoding, setEnableTranscoding] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'high' | 'medium' | 'low'>('high');

  const [userTier, setUserTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingStatus, setTranscodingStatus] = useState<TranscodingStatus | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Check if file is a video
  const isVideo = mimeType.startsWith('video/');

  // Fetch user's subscription tier
  useEffect(() => {
    const fetchUserTier = async () => {
      try {
        const response = await fetch('/api/user/subscription', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserTier(data.tier);
        }
      } catch (error) {
        console.error('Failed to fetch subscription tier:', error);
      }
    };

    fetchUserTier();
  }, [token]);

  // Poll transcoding status if job is in progress
  useEffect(() => {
    if (!isTranscoding) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/media/transcode/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const status: TranscodingStatus = await response.json();
          setTranscodingStatus(status);

          if (status.status === 'completed') {
            setIsTranscoding(false);
            onTranscodingComplete?.(status.hlsManifestUrl || '');
          } else if (status.status === 'failed') {
            setIsTranscoding(false);
            onError?.(new Error(status.errorMessage || 'Transcoding failed'));
          }
        }
      } catch (error) {
        console.error('Failed to fetch transcoding status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isTranscoding, fileId, token, onTranscodingComplete, onError]);

  // Handle DRM toggle
  const handleDrmToggle = (checked: boolean) => {
    if (checked && userTier && !userTier.canUseDrm) {
      setShowUpgradePrompt(true);
      return;
    }
    setEnableDrm(checked);
  };

  // Submit transcoding job
  const handleStartTranscoding = async () => {
    if (!enableTranscoding) return;

    setIsLoading(true);

    try {
      const response = await fetch('/media/transcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileId,
          enableDrm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        if (error.upgradeRequired) {
          setShowUpgradePrompt(true);
          throw new Error('DRM requires subscription upgrade');
        }

        throw new Error(error.error || 'Transcoding submission failed');
      }

      const data = await response.json();

      setIsTranscoding(true);
      setTranscodingStatus({
        status: 'processing',
        progress: 0,
      });

      onTranscodingStart?.(data.jobId);

    } catch (error) {
      console.error('Transcoding submission error:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Quality preset descriptions
  const qualityPresets = {
    high: {
      label: 'High (1080p, 720p, 480p)',
      description: 'Best quality, larger file size, longer processing',
      icon: <Zap className="w-4 h-4" />,
    },
    medium: {
      label: 'Medium (720p, 480p)',
      description: 'Balanced quality and size',
      icon: <Film className="w-4 h-4" />,
    },
    low: {
      label: 'Low (480p)',
      description: 'Faster processing, smaller file',
      icon: <Clock className="w-4 h-4" />,
    },
  };

  if (!isVideo) {
    return null; // Don't show for non-video files
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Film className="w-5 h-5" />
              Video Processing Options
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure streaming and protection for {fileName}
            </p>
          </div>

          {userTier && (
            <Badge variant={userTier.canUseDrm ? 'primary' : 'secondary'}>
              {userTier.canUseDrm && <Crown className="w-3 h-3 mr-1" />}
              {userTier.name}
            </Badge>
          )}
        </div>

        {/* HLS Transcoding Toggle */}
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="transcoding" className="font-medium">
                Enable Adaptive Streaming (HLS)
              </label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Convert to HLS for adaptive bitrate streaming on all devices
            </p>
          </div>
          <Switch
            id="transcoding"
            checked={enableTranscoding}
            onCheckedChange={setEnableTranscoding}
          />
        </div>

        {/* DRM Protection Toggle */}
        {enableTranscoding && (
          <div className="flex items-start justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-blue-500" />
                <label htmlFor="drm" className="font-medium">
                  FairPlay DRM Protection
                </label>
                {!userTier?.canUseDrm && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
              <p className="text-sm text-muted-foreground">
                Encrypt content with Apple FairPlay DRM (iOS/macOS/tvOS)
              </p>
              {!userTier?.canUseDrm && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Requires Pro or Enterprise subscription
                </p>
              )}
            </div>
            <Switch
              id="drm"
              checked={enableDrm}
              onCheckedChange={handleDrmToggle}
            />
          </div>
        )}

        {/* Quality Presets */}
        {enableTranscoding && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Quality Presets</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(qualityPresets) as Array<keyof typeof qualityPresets>).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedQuality(key)}
                  className={cn(
                    'flex items-start gap-3 p-3 border rounded-lg text-left transition-colors',
                    selectedQuality === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="mt-0.5">{qualityPresets[key].icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{qualityPresets[key].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {qualityPresets[key].description}
                    </div>
                  </div>
                  {selectedQuality === key && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transcoding Status */}
        {isTranscoding && transcodingStatus && (
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500" />
              <span className="font-medium">Processing Video...</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transcodingStatus.progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {transcodingStatus.progress}% complete - Estimated time: {5 - Math.floor(transcodingStatus.progress / 20)} minutes
            </p>
          </div>
        )}

        {/* Start Button */}
        {enableTranscoding && !isTranscoding && (
          <Button
            onClick={handleStartTranscoding}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                Start Processing {enableDrm && '(with DRM)'}
              </>
            )}
          </Button>
        )}

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Upgrade Required</h3>
                  <p className="text-sm text-muted-foreground">
                    FairPlay DRM protection is available on Pro and Enterprise plans.
                    Upgrade now to protect your premium content.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Pro Plan Benefits:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    FairPlay DRM protection
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    100GB storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-purple-500" />
                    3 concurrent streams
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradePrompt(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to upgrade page
                    window.location.href = '/settings/subscription';
                  }}
                  className="flex-1"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">About HLS Streaming</p>
            <p className="text-xs opacity-80">
              HLS (HTTP Live Streaming) automatically adjusts video quality based on viewer's
              internet speed, ensuring smooth playback on all devices.
              {enableDrm && ' FairPlay DRM prevents unauthorized copying and sharing.'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
