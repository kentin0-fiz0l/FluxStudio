import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  Heart,
  Share2,
  Download,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Info,
  Tag
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  tags: string[];
  metadata?: {
    width: number;
    height: number;
    size: number;
    duration?: number;
  };
  isLiked: boolean;
  likes: number;
}

interface MobileGalleryProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  onDownload?: (itemId: string) => void;
}

export const MobileGallery: React.FC<MobileGalleryProps> = ({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onLike,
  onShare,
  onDownload
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];

  // Define navigation functions before useEffect
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          if (currentItem.type === 'video') {
            togglePlayback();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex, onClose, goToPrevious, goToNext, currentItem.type, togglePlayback]);

  // Reset zoom and video state when changing items
  useEffect(() => {
    // Use setTimeout to move setState out of synchronous effect body
    const timeout = setTimeout(() => {
      setZoom(1);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [currentIndex]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handlePan = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Handle swipe gestures
    if (Math.abs(info.offset.x) > 100) {
      if (info.offset.x > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />

      {/* Media Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
        onClick={() => setShowControls(!showControls)}
      >
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-full max-h-full"
          drag={zoom === 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handlePan}
          style={{ scale: zoom }}
        >
          {currentItem.type === 'image' ? (
            <img
              src={currentItem.url}
              alt={currentItem.title}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={currentItem.url}
              className="max-w-full max-h-full object-contain"
              controls={false}
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlayback}
            />
          )}
        </motion.div>
      </div>

      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4"
          >
            <div className="flex items-center justify-between text-white">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center space-x-1 text-sm">
                <span>{currentIndex + 1}</span>
                <span>/</span>
                <span>{items.length}</span>
              </div>

              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Info className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4"
          >
            {/* Media Title */}
            <div className="text-white mb-4">
              <h3 className="font-semibold text-lg">{currentItem.title}</h3>
              {currentItem.description && (
                <p className="text-sm text-gray-300 mt-1">{currentItem.description}</p>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Side - Navigation */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPrevious}
                  disabled={items.length <= 1}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={goToNext}
                  disabled={items.length <= 1}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Center - Media Controls */}
              <div className="flex items-center space-x-4">
                {currentItem.type === 'video' && (
                  <>
                    <button
                      onClick={togglePlayback}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                  </>
                )}

                {currentItem.type === 'image' && (
                  <>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.5}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <ZoomOut className="w-6 h-6" />
                    </button>

                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 5}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <ZoomIn className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Right Side - Actions */}
              <div className="flex items-center space-x-4">
                {onLike && (
                  <button
                    onClick={() => onLike(currentItem.id)}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      currentItem.isLiked
                        ? 'text-red-500 hover:bg-red-500/20'
                        : 'text-white hover:bg-white/20'
                    )}
                  >
                    <Heart className={cn('w-6 h-6', currentItem.isLiked && 'fill-current')} />
                  </button>
                )}

                {onShare && (
                  <button
                    onClick={() => onShare(currentItem.id)}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                )}

                {onDownload && (
                  <button
                    onClick={() => onDownload(currentItem.id)}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-black/90 backdrop-blur-sm text-white p-6 overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Title and Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">{currentItem.title}</h3>
                {currentItem.description && (
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentItem.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              {currentItem.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentItem.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/20 rounded-md text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {currentItem.metadata && (
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span>{currentItem.metadata.width} × {currentItem.metadata.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span>{formatFileSize(currentItem.metadata.size)}</span>
                    </div>
                    {currentItem.type === 'video' && currentItem.metadata.duration && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{formatDuration(currentItem.metadata.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Engagement */}
              <div>
                <h4 className="font-medium mb-2">Engagement</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <div className="flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>{currentItem.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};