/**
 * CameraFeed Component
 * Live MJPEG camera stream viewer with snapshot functionality
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import {
  Camera,
  Download,
  Maximize2,
  RefreshCw,
  Circle,
} from 'lucide-react';
import { CameraFeedProps } from '@/types/printing';
import { cn } from '@/lib/utils';

const CAMERA_STREAM_URL = '/api/printing/camera/stream';
const CAMERA_SNAPSHOT_URL = '/api/printing/camera/snapshot';

export const CameraFeed: React.FC<CameraFeedProps> = ({
  config,
  loading = false,
  error = null,
  onSnapshot,
  className = '',
}) => {
  const [streamError, setStreamError] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [streamKey, setStreamKey] = React.useState(0); // For forcing reload

  const imgRef = React.useRef<HTMLImageElement>(null);

  /**
   * Handle image load success
   */
  const handleImageLoad = () => {
    setIsLive(true);
    setStreamError(null);
  };

  /**
   * Handle image load error
   */
  const handleImageError = () => {
    setIsLive(false);
    setStreamError('Unable to load camera stream');
  };

  /**
   * Refresh the stream by updating the key
   */
  const handleRefresh = () => {
    setStreamKey((prev) => prev + 1);
    setStreamError(null);
  };

  /**
   * Capture snapshot
   */
  const handleSnapshot = async () => {
    setIsCapturing(true);
    try {
      const response = await fetch(CAMERA_SNAPSHOT_URL);

      if (!response.ok) {
        throw new Error('Failed to capture snapshot');
      }

      const blob = await response.blob();
      const image = await blob.text(); // Assuming base64 encoded

      // Create download link
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${image}`;
      link.download = `snapshot_${new Date().toISOString()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Call callback if provided
      if (onSnapshot) {
        onSnapshot({
          image,
          timestamp: Date.now(),
          mimeType: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      setStreamError('Failed to capture snapshot');
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Toggle fullscreen dialog
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  /**
   * Render camera image
   */
  const renderCamera = (fullscreen = false) => {
    const streamUrl = config?.streamUrl || CAMERA_STREAM_URL;

    return (
      <div className={cn(
        'relative bg-neutral-900 rounded-lg overflow-hidden',
        fullscreen ? 'w-full h-[80vh]' : 'aspect-video'
      )}>
        {/* Stream */}
        <img
          ref={!fullscreen ? imgRef : undefined}
          key={streamKey}
          src={`${streamUrl}?t=${streamKey}`}
          alt="Printer camera feed"
          className={cn(
            'w-full h-full object-contain',
            config?.flipH && 'scale-x-[-1]',
            config?.flipV && 'scale-y-[-1]',
            config?.rotate90 && 'rotate-90'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Live Indicator */}
        {isLive && !streamError && (
          <Badge
            variant="solidError"
            className="absolute top-3 left-3 flex items-center gap-1.5"
          >
            <Circle className="h-2 w-2 fill-current animate-pulse" />
            LIVE
          </Badge>
        )}

        {/* Error Overlay */}
        {(streamError || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/90">
            <div className="text-center space-y-3 p-6">
              <Camera className="h-12 w-12 text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-400">
                {streamError || error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Controls Overlay (only in card view) */}
        {!fullscreen && !streamError && !error && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSnapshot}
              disabled={isCapturing || !isLive}
              loading={isCapturing}
              className="bg-neutral-900/70 hover:bg-neutral-900/90 backdrop-blur-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Snapshot
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              disabled={!isLive}
              className="bg-neutral-900/70 hover:bg-neutral-900/90 backdrop-blur-sm h-9 w-9"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Feed
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8"
              aria-label="Refresh camera"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {renderCamera()}

          {/* Camera Info */}
          {config && !error && !streamError && (
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
              <span>Resolution: Auto</span>
              <span>FPS: 15</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Feed
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSnapshot}
                disabled={isCapturing || !isLive}
                loading={isCapturing}
              >
                <Download className="h-4 w-4 mr-2" />
                Snapshot
              </Button>
            </DialogTitle>
          </DialogHeader>
          {renderCamera(true)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CameraFeed;
