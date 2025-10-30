/**
 * HLSUploadOptions Component
 *
 * Simplified UI for enabling HLS adaptive streaming during file upload
 *
 * Features:
 * - HLS transcoding toggle
 * - Quality presets (High/Medium/Low)
 * - Real-time progress tracking
 * - No DRM complexity - cost-effective streaming only
 *
 * Usage:
 * <HLSUploadOptions
 *   fileId="uuid"
 *   fileName="video.mp4"
 *   onTranscodingStart={(jobId) => console.log('Started:', jobId)}
 *   onTranscodingComplete={(hlsUrl) => console.log('Complete:', hlsUrl)}
 * />
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import {
  Film,
  Zap,
  Clock,
  CheckCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface HLSUploadOptionsProps {
  fileId: string;
  fileName: string;
  mimeType?: string;
  onTranscodingStart?: (jobId: string) => void;
  onTranscodingComplete?: (hlsUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface TranscodingStatus {
  status: string;
  progress: number;
  hlsManifestUrl?: string;
  errorMessage?: string;
}

export function HLSUploadOptions({
  fileId,
  fileName,
  mimeType = 'video/mp4',
  onTranscodingStart,
  onTranscodingComplete,
  onError,
  className,
}: HLSUploadOptionsProps) {
  const { token } = useAuth();

  const [enableTranscoding, setEnableTranscoding] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'high' | 'medium' | 'low'>('high');

  const [isLoading, setIsLoading] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingStatus, setTranscodingStatus] = useState<TranscodingStatus | null>(null);

  // Check if file is a video
  const isVideo = mimeType.startsWith('video/');

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
          quality: selectedQuality,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
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
      label: 'High Quality',
      description: '1080p, 720p, 480p - Best viewing experience',
      icon: <Zap className="w-4 h-4" />,
      details: 'Larger file size, longer processing time',
    },
    medium: {
      label: 'Medium Quality',
      description: '720p, 480p - Balanced quality and size',
      icon: <Film className="w-4 h-4" />,
      details: 'Good for most use cases',
    },
    low: {
      label: 'Low Quality',
      description: '480p - Faster processing',
      icon: <Clock className="w-4 h-4" />,
      details: 'Smaller file size, quickest processing',
    },
  };

  if (!isVideo) {
    return null; // Don't show for non-video files
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Film className="w-5 h-5" />
            Video Streaming Options
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure adaptive streaming for {fileName}
          </p>
        </div>

        {/* HLS Transcoding Toggle */}
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="transcoding" className="font-medium">
                Enable HLS Adaptive Streaming
              </label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically adjusts video quality based on viewer's internet speed
            </p>
          </div>
          <Switch
            id="transcoding"
            checked={enableTranscoding}
            onCheckedChange={setEnableTranscoding}
          />
        </div>

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
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  )}
                >
                  <div className="mt-0.5">{qualityPresets[key].icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{qualityPresets[key].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {qualityPresets[key].description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 opacity-75">
                      {qualityPresets[key].details}
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
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="font-medium">Processing Video...</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transcodingStatus.progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {transcodingStatus.progress}% complete
              {transcodingStatus.progress > 0 && (
                <> - Estimated time remaining: {Math.ceil((100 - transcodingStatus.progress) / 20)} minutes</>
              )}
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                Start HLS Processing
              </>
            )}
          </Button>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">About HLS Streaming</p>
            <p className="text-xs opacity-80">
              HLS (HTTP Live Streaming) creates multiple quality versions of your video.
              Viewers automatically get the best quality for their internet speed,
              ensuring smooth playback without buffering.
            </p>
          </div>
        </div>

        {/* Processing Info */}
        {enableTranscoding && !isTranscoding && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Processing time: {selectedQuality === 'high' ? '5-10' : selectedQuality === 'medium' ? '3-7' : '2-5'} minutes for typical videos</span>
            </p>
            <p className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>You'll receive a notification when processing is complete</span>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
