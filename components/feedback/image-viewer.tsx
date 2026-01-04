'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  MessageSquarePlus,
} from 'lucide-react';

interface Annotation {
  id: string;
  x: number;
  y: number;
  content: string;
  author: string;
  isResolved: boolean;
}

interface ImageViewerProps {
  src: string;
  alt: string;
  annotations?: Annotation[];
  onAddAnnotation?: (position: { x: number; y: number }) => void;
  onSelectAnnotation?: (annotation: Annotation) => void;
  className?: string;
}

export function ImageViewer({
  src,
  alt,
  annotations = [],
  onAddAnnotation,
  onSelectAnnotation,
  className,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAnnotating || !onAddAnnotation || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      onAddAnnotation({ x, y });
      setIsAnnotating(false);
    },
    [isAnnotating, onAddAnnotation]
  );

  const handleAnnotationClick = (annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAnnotation(annotation.id);
    onSelectAnnotation?.(annotation);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="ghost" size="icon" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isAnnotating ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsAnnotating(!isAnnotating)}
            className="gap-2"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {isAnnotating ? 'Click to annotate' : 'Add annotation'}
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 relative overflow-auto bg-muted/20',
          isAnnotating && 'cursor-crosshair'
        )}
        onClick={handleImageClick}
      >
        <div
          className="relative inline-block min-w-full min-h-full"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            priority
          />

          {/* Annotation markers */}
          {annotations.map((annotation, index) => (
            <button
              key={annotation.id}
              className={cn(
                'annotation-marker',
                selectedAnnotation === annotation.id && 'active',
                annotation.isResolved && 'opacity-50'
              )}
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={(e) => handleAnnotationClick(annotation, e)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
