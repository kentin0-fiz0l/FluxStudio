/**
 * EnhancedImageViewer Component - Advanced Image Viewer with Zoom/Pan
 * High-performance image viewer with zoom, pan, and annotation support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Download,
  Grid3x3,
  Move,
  MousePointer,
  Fullscreen,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { MessageAttachment, ImageAnnotation } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface EnhancedImageViewerProps {
  attachment: MessageAttachment;
  annotations?: ImageAnnotation[];
  onAnnotationClick?: (annotation: ImageAnnotation, position: { x: number; y: number }) => void;
  className?: string;
  showMinimap?: boolean;
  showGrid?: boolean;
  allowDownload?: boolean;
}

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const ZOOM_STEP = 25;

export function EnhancedImageViewer({
  attachment,
  annotations = [],
  onAnnotationClick,
  className,
  showMinimap = true,
  showGrid: initialShowGrid = false,
  allowDownload = true
}: EnhancedImageViewerProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 100,
    panX: 0,
    panY: 0,
    rotation: 0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(initialShowGrid);
  const [, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [cursorMode, setCursorMode] = useState<'pan' | 'select'>('select');

  // Center image on load or container resize
  const centerImage = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scale = viewport.zoom / 100;
    const imageWidth = imageRef.current.width * scale;
    const imageHeight = imageRef.current.height * scale;

    // Calculate center position
    const panX = (containerWidth - imageWidth) / 2;
    const panY = (containerHeight - imageHeight) / 2;

    setViewport(prev => ({ ...prev, panX, panY }));
  }, [viewport.zoom]);

  // Render main canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();

    const scale = viewport.zoom / 100;
    const imageWidth = imageRef.current.width * scale;
    const imageHeight = imageRef.current.height * scale;

    // Apply rotation
    if (viewport.rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((viewport.rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      const gridSize = 50 * scale;

      for (let x = viewport.panX % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = viewport.panY % gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw image
    ctx.drawImage(
      imageRef.current,
      viewport.panX,
      viewport.panY,
      imageWidth,
      imageHeight
    );

    // Draw annotations
    annotations.forEach(annotation => {
      const isHovered = hoveredAnnotation === annotation.id;

      ctx.save();
      ctx.globalAlpha = isHovered ? 1 : 0.8;

      const x = viewport.panX + annotation.x * scale;
      const y = viewport.panY + annotation.y * scale;

      switch (annotation.type) {
        case 'point':
          // Draw point with pulse effect if hovered
          ctx.fillStyle = annotation.color;
          ctx.beginPath();
          ctx.arc(x, y, isHovered ? 8 : 6, 0, 2 * Math.PI);
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = annotation.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'rectangle':
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.strokeRect(
            x,
            y,
            (annotation.width || 0) * scale,
            (annotation.height || 0) * scale
          );

          if (isHovered) {
            ctx.fillStyle = annotation.color;
            ctx.globalAlpha = 0.1;
            ctx.fillRect(
              x,
              y,
              (annotation.width || 0) * scale,
              (annotation.height || 0) * scale
            );
          }
          break;

        case 'circle':
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = isHovered ? 3 : 2;
          const radius = ((annotation.width || 0) / 2) * scale;
          ctx.beginPath();
          ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);
          ctx.stroke();

          if (isHovered) {
            ctx.fillStyle = annotation.color;
            ctx.globalAlpha = 0.1;
            ctx.fill();
          }
          break;

        case 'arrow':
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = isHovered ? 3 : 2;
          const endX = x + (annotation.width || 0) * scale;
          const endY = y + (annotation.height || 0) * scale;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(
            (annotation.height || 0),
            (annotation.width || 0)
          );
          const arrowLength = 12;

          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          break;

        case 'text':
          ctx.fillStyle = annotation.color;
          ctx.font = `${16 * scale}px Arial`;
          ctx.fillText(annotation.content, x, y);
          break;
      }

      // Draw annotation label
      if (annotation.content && annotation.type !== 'text') {
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 1, y - 20, annotation.content.length * 8 + 10, 20);
        ctx.fillStyle = annotation.color;
        ctx.font = '12px Arial';
        ctx.fillText(annotation.content.substring(0, 20), x + 4, y - 6);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [viewport, annotations, hoveredAnnotation, showGrid]);

  // Render minimap
  const renderMinimap = useCallback(() => {
    if (!minimapCanvasRef.current || !imageRef.current || !showMinimap) return;

    const canvas = minimapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minimapSize = 150;
    canvas.width = minimapSize;
    canvas.height = minimapSize;

    // Clear minimap
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, minimapSize, minimapSize);

    // Calculate minimap scale
    const imageAspect = imageRef.current.width / imageRef.current.height;
    let minimapImageWidth, minimapImageHeight;

    if (imageAspect > 1) {
      minimapImageWidth = minimapSize * 0.8;
      minimapImageHeight = (minimapSize * 0.8) / imageAspect;
    } else {
      minimapImageHeight = minimapSize * 0.8;
      minimapImageWidth = minimapSize * 0.8 * imageAspect;
    }

    const minimapX = (minimapSize - minimapImageWidth) / 2;
    const minimapY = (minimapSize - minimapImageHeight) / 2;

    // Draw minimap image
    ctx.drawImage(
      imageRef.current,
      minimapX,
      minimapY,
      minimapImageWidth,
      minimapImageHeight
    );

    // Draw viewport indicator
    if (containerRef.current) {
      const scale = viewport.zoom / 100;
      const viewportWidth = containerRef.current.clientWidth / scale;
      const viewportHeight = containerRef.current.clientHeight / scale;

      const minimapScale = minimapImageWidth / imageRef.current.width;
      const indicatorWidth = viewportWidth * minimapScale;
      const indicatorHeight = viewportHeight * minimapScale;
      const indicatorX = minimapX - (viewport.panX / scale) * minimapScale;
      const indicatorY = minimapY - (viewport.panY / scale) * minimapScale;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
    }
  }, [viewport, showMinimap]);

  // Load image - must be after centerImage, renderCanvas, renderMinimap are declared
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      centerImage();
      renderCanvas();
      renderMinimap();
    };
    img.onerror = () => {
      console.error('Failed to load image:', attachment.url);
    };
    img.src = attachment.url;

    return () => {
      if (imageRef.current) {
        imageRef.current = null;
      }
    };
  }, [attachment.url, centerImage, renderCanvas, renderMinimap]);

  // Update renders when viewport changes
  useEffect(() => {
    renderCanvas();
    renderMinimap();
  }, [renderCanvas, renderMinimap]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      renderCanvas();
      renderMinimap();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas, renderMinimap]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (cursorMode === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPan({ x: viewport.panX, y: viewport.panY });
      e.preventDefault();
    } else if (cursorMode === 'select' && onAnnotationClick) {
      // Check if clicking on annotation
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const scale = viewport.zoom / 100;

      for (const annotation of annotations) {
        const annotX = viewport.panX + annotation.x * scale;
        const annotY = viewport.panY + annotation.y * scale;

        let hit = false;
        switch (annotation.type) {
          case 'point':
            hit = Math.sqrt((x - annotX) ** 2 + (y - annotY) ** 2) < 10;
            break;
          case 'rectangle':
            hit = x >= annotX && x <= annotX + (annotation.width || 0) * scale &&
                  y >= annotY && y <= annotY + (annotation.height || 0) * scale;
            break;
          // Add other annotation type hit detection as needed
        }

        if (hit) {
          onAnnotationClick(annotation, { x: annotX, y: annotY });
          break;
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setViewport(prev => ({
        ...prev,
        panX: lastPan.x + deltaX,
        panY: lastPan.y + deltaY
      }));
    } else {
      // Check hover on annotations
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const scale = viewport.zoom / 100;

      let hoveredId: string | null = null;
      for (const annotation of annotations) {
        const annotX = viewport.panX + annotation.x * scale;
        const annotY = viewport.panY + annotation.y * scale;

        let hit = false;
        switch (annotation.type) {
          case 'point':
            hit = Math.sqrt((x - annotX) ** 2 + (y - annotY) ** 2) < 10;
            break;
          case 'rectangle':
            hit = x >= annotX && x <= annotX + (annotation.width || 0) * scale &&
                  y >= annotY && y <= annotY + (annotation.height || 0) * scale;
            break;
        }

        if (hit) {
          hoveredId = annotation.id;
          break;
        }
      }
      setHoveredAnnotation(hoveredId);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    handleZoom(viewport.zoom + delta);
  };

  // Zoom controls
  const handleZoom = (newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setViewport(prev => ({ ...prev, zoom: clampedZoom }));
  };

  const handleZoomIn = () => handleZoom(viewport.zoom + ZOOM_STEP);
  const handleZoomOut = () => handleZoom(viewport.zoom - ZOOM_STEP);

  const handleZoomFit = () => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / imageRef.current.width;
    const scaleY = containerHeight / imageRef.current.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding

    setViewport({
      zoom: scale * 100,
      panX: (containerWidth - imageRef.current.width * scale) / 2,
      panY: (containerHeight - imageRef.current.height * scale) / 2,
      rotation: 0
    });
  };

  // Rotation control
  const handleRotate = () => {
    setViewport(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  // Download image
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn('relative bg-gray-100 overflow-hidden', className)}
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <Card className="px-3 py-2 bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-2">
              {/* Cursor Mode */}
              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <Button
                  size="sm"
                  variant={cursorMode === 'select' ? 'primary' : 'ghost'}
                  onClick={() => setCursorMode('select')}
                  className="h-7 px-2"
                >
                  <MousePointer size={14} />
                </Button>
                <Button
                  size="sm"
                  variant={cursorMode === 'pan' ? 'primary' : 'ghost'}
                  onClick={() => setCursorMode('pan')}
                  className="h-7 px-2"
                >
                  <Move size={14} />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-7 w-7 p-0">
                      <ZoomOut size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>

                <div className="min-w-[80px]">
                  <Slider
                    value={[viewport.zoom]}
                    onValueChange={([value]) => handleZoom(value)}
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={5}
                    className="w-full"
                  />
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-7 w-7 p-0">
                      <ZoomIn size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>

                <Badge variant="secondary" className="text-xs min-w-[50px] text-center">
                  {Math.round(viewport.zoom)}%
                </Badge>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* View Controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={handleZoomFit} className="h-7 w-7 p-0">
                    <Maximize2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to Screen</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={handleRotate} className="h-7 w-7 p-0">
                    <RotateCw size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate 90°</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={showGrid ? 'primary' : 'ghost'}
                    onClick={() => setShowGrid(!showGrid)}
                    className="h-7 w-7 p-0"
                  >
                    <Grid3x3 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Grid</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-gray-300" />

              {/* Actions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="h-7 w-7 p-0">
                    <Fullscreen size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>

              {allowDownload && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 w-7 p-0">
                      <Download size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              )}
            </div>
          </Card>
        </div>

        {/* Main Canvas */}
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0',
            cursorMode === 'pan' ? 'cursor-move' : 'cursor-default',
            isDragging && 'cursor-grabbing'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Minimap */}
        {showMinimap && (
          <div className="absolute bottom-4 right-4 z-10">
            <Card className="p-1 bg-white/95 backdrop-blur-sm shadow-lg">
              <canvas
                ref={minimapCanvasRef}
                className="w-[150px] h-[150px] rounded"
              />
            </Card>
          </div>
        )}

        {/* Info Panel */}
        {imageDimensions.width > 0 && (
          <div className="absolute bottom-4 left-4 z-10">
            <Card className="px-3 py-2 bg-white/95 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Info size={12} />
                  <span>{imageDimensions.width} × {imageDimensions.height}px</span>
                </div>
                {annotations.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-gray-300" />
                    <Badge variant="secondary" className="text-xs">
                      {annotations.length} annotations
                    </Badge>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-500">Loading image...</div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default EnhancedImageViewer;