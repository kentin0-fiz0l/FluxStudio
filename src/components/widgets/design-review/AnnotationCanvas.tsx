import React, { useState, useRef, useCallback } from 'react';
import {
  MousePointer,
  Type,
  Circle,
  Square,
  ArrowRight
} from 'lucide-react';
import { ImageAnnotation } from '../../../types/messaging';
import { promptDialog } from '@/lib/confirm';

export interface AnnotationTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  cursor: string;
}

export const annotationTools: AnnotationTool[] = [
  { id: 'point', name: 'Point', icon: MousePointer, cursor: 'crosshair' },
  { id: 'text', name: 'Text', icon: Type, cursor: 'text' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, cursor: 'crosshair' },
  { id: 'circle', name: 'Circle', icon: Circle, cursor: 'crosshair' },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight, cursor: 'crosshair' }
];

export function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationAdd,
  activeTool,
  activeColor,
  className = ''
}: {
  imageUrl: string;
  annotations: ImageAnnotation[];
  onAnnotationAdd: (annotation: Omit<ImageAnnotation, 'id' | 'createdAt' | 'createdBy'>) => void;
  activeTool: string;
  activeColor: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<ImageAnnotation> | null>(null);

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (!canvasRef.current || activeTool === 'move') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setStartPos({ x, y });
    setIsDrawing(true);

    if (activeTool === 'point') {
      // Point annotations are created immediately
      onAnnotationAdd({
        x,
        y,
        type: 'point',
        color: activeColor,
        content: `Point annotation at ${x.toFixed(1)}%, ${y.toFixed(1)}%`
      });
      setIsDrawing(false);
    } else if (activeTool === 'text') {
      // Text annotations need content input
      const content = await promptDialog('Enter annotation text:', { title: 'Add Annotation' });
      if (content) {
        onAnnotationAdd({
          x,
          y,
          type: 'text',
          color: activeColor,
          content
        });
      }
      setIsDrawing(false);
    }
  }, [activeTool, activeColor, onAnnotationAdd]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      setTempAnnotation({
        x: Math.min(startPos.x, currentX),
        y: Math.min(startPos.y, currentY),
        width: Math.abs(currentX - startPos.x),
        height: Math.abs(currentY - startPos.y),
        type: activeTool,
        color: activeColor,
        content: `${activeTool} annotation`
      });
    }
  }, [isDrawing, startPos, activeTool, activeColor]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !tempAnnotation) return;

    if (tempAnnotation.width && tempAnnotation.height && tempAnnotation.width > 1 && tempAnnotation.height > 1) {
      onAnnotationAdd({
        x: tempAnnotation.x!,
        y: tempAnnotation.y!,
        width: tempAnnotation.width,
        height: tempAnnotation.height,
        type: tempAnnotation.type!,
        color: tempAnnotation.color!,
        content: tempAnnotation.content!
      });
    }

    setIsDrawing(false);
    setStartPos(null);
    setTempAnnotation(null);
  }, [isDrawing, tempAnnotation, onAnnotationAdd]);

  return (
    <div
      ref={canvasRef}
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
      style={{ cursor: annotationTools.find(t => t.id === activeTool)?.cursor || 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img
        src={imageUrl}
        alt="Design for review"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Existing annotations */}
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="absolute pointer-events-none"
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            width: annotation.width ? `${annotation.width}%` : 'auto',
            height: annotation.height ? `${annotation.height}%` : 'auto'
          }}
        >
          {annotation.type === 'point' && (
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
              style={{ backgroundColor: annotation.color }}
            >
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          )}

          {annotation.type === 'rectangle' && (
            <div
              className="border-2 border-white shadow-lg bg-opacity-20"
              style={{
                borderColor: annotation.color,
                backgroundColor: annotation.color
              }}
            />
          )}

          {annotation.type === 'circle' && (
            <div
              className="border-2 border-white shadow-lg bg-opacity-20 rounded-full"
              style={{
                borderColor: annotation.color,
                backgroundColor: annotation.color
              }}
            />
          )}

          {annotation.type === 'text' && (
            <div
              className="px-2 py-1 rounded text-xs font-medium text-white shadow-lg max-w-32"
              style={{ backgroundColor: annotation.color }}
            >
              {annotation.content}
            </div>
          )}
        </div>
      ))}

      {/* Temporary annotation while drawing */}
      {tempAnnotation && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${tempAnnotation.x}%`,
            top: `${tempAnnotation.y}%`,
            width: `${tempAnnotation.width}%`,
            height: `${tempAnnotation.height}%`
          }}
        >
          {tempAnnotation.type === 'rectangle' && (
            <div
              className="border-2 border-dashed bg-opacity-20"
              style={{
                borderColor: tempAnnotation.color,
                backgroundColor: tempAnnotation.color
              }}
            />
          )}

          {tempAnnotation.type === 'circle' && (
            <div
              className="border-2 border-dashed bg-opacity-20 rounded-full"
              style={{
                borderColor: tempAnnotation.color,
                backgroundColor: tempAnnotation.color
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
