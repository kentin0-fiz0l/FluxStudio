/**
 * ScreenShare Component - Flux Studio
 *
 * Screen sharing viewer and controls for collaborative presentations.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Users,
  X,
  MessageSquare,
  Settings,
  Hand,
  MousePointer,
  PenTool,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScreenShareProps {
  stream: MediaStream;
  presenterName: string;
  isPresenter?: boolean;
  participantCount: number;
  onStopSharing?: () => void;
  onClose: () => void;
  onOpenChat?: () => void;
  onRequestControl?: () => void;
}

interface Annotation {
  id: string;
  type: 'pointer' | 'draw';
  x: number;
  y: number;
  color: string;
  path?: { x: number; y: number }[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScreenShare({
  stream,
  presenterName,
  isPresenter = false,
  participantCount,
  onStopSharing,
  onClose,
  onOpenChat,
  onRequestControl,
}: ScreenShareProps) {
  const { t } = useTranslation('common');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [annotationMode, setAnnotationMode] = useState<'none' | 'pointer' | 'draw'>('none');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle annotation click
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode === 'none') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotationMode === 'pointer') {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'pointer',
        x,
        y,
        color: '#ef4444',
      };
      setAnnotations((prev) => [...prev, newAnnotation]);

      // Remove pointer after 2 seconds
      setTimeout(() => {
        setAnnotations((prev) => prev.filter((a) => a.id !== newAnnotation.id));
      }, 2000);
    }
  };

  // Clear all annotations
  const clearAnnotations = () => {
    setAnnotations([]);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header - fades with controls */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Monitor className="w-5 h-5 text-blue-400" />
            <span className="font-medium">
              {isPresenter
                ? t('screenShare.youAreSharing', 'You are sharing your screen')
                : t('screenShare.viewing', '{{name}} is sharing', { name: presenterName })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {participantCount} {t('screenShare.watching', 'watching')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={t('screenShare.openChat', 'Open chat')}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? t('screenShare.exitFullscreen', 'Exit fullscreen') : t('screenShare.fullscreen', 'Fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Screen Content */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={handleCanvasClick}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="max-w-full max-h-full object-contain"
        />

        {/* Annotation Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {annotation.type === 'pointer' && (
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full animate-ping absolute"
                    style={{ backgroundColor: `${annotation.color}50` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: annotation.color }}
                  >
                    <MousePointer className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls - fades with header */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-6 py-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Annotation Tools */}
        <div className="flex items-center gap-2 bg-gray-800/80 rounded-lg p-2">
          <button
            onClick={() => setAnnotationMode(annotationMode === 'pointer' ? 'none' : 'pointer')}
            className={`p-3 rounded-lg transition-colors ${
              annotationMode === 'pointer'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={t('screenShare.pointer', 'Pointer')}
          >
            <MousePointer className="w-5 h-5" />
          </button>
          <button
            onClick={() => setAnnotationMode(annotationMode === 'draw' ? 'none' : 'draw')}
            className={`p-3 rounded-lg transition-colors ${
              annotationMode === 'draw'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={t('screenShare.draw', 'Draw')}
          >
            <PenTool className="w-5 h-5" />
          </button>
          {annotations.length > 0 && (
            <button
              onClick={clearAnnotations}
              className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title={t('screenShare.clearAnnotations', 'Clear annotations')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Request Control (for viewers) */}
        {!isPresenter && onRequestControl && (
          <button
            onClick={onRequestControl}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Hand className="w-5 h-5" />
            <span>{t('screenShare.requestControl', 'Request Control')}</span>
          </button>
        )}

        {/* Stop Sharing (for presenter) */}
        {isPresenter && onStopSharing && (
          <button
            onClick={onStopSharing}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <MonitorOff className="w-5 h-5" />
            <span>{t('screenShare.stopSharing', 'Stop Sharing')}</span>
          </button>
        )}
      </div>

      {/* Presenter Badge */}
      {!isPresenter && (
        <div className="absolute bottom-24 left-6 flex items-center gap-3 px-4 py-2 bg-gray-800/90 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {presenterName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white text-sm font-medium">{presenterName}</div>
            <div className="text-gray-400 text-xs">
              {t('screenShare.presenter', 'Presenter')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreenShare;
