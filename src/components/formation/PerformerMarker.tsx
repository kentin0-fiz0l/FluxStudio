/**
 * PerformerMarker Component - Flux Studio
 *
 * Draggable marker representing a performer on the formation canvas.
 * Supports drag-drop positioning, selection, and grouping.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Performer, Position } from '../../services/formationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PerformerMarkerProps {
  performer: Performer;
  position: Position;
  isSelected?: boolean;
  /** True when this performer is part of a multi-selection (2+ performers selected) */
  isMultiSelected?: boolean;
  isLocked?: boolean;
  showLabel?: boolean;
  showRotation?: boolean;
  scale?: number; // Canvas scale factor
  /** When true, adds CSS transition for smooth playback animation */
  isAnimating?: boolean;
  onSelect?: (performerId: string, multiSelect: boolean) => void;
  onMove?: (performerId: string, position: Position) => void;
  onRotate?: (performerId: string, rotation: number) => void;
  onContextMenu?: (performerId: string, event: React.MouseEvent) => void;
  /** Callback when drag starts - return false to prevent drag (for collaboration conflict) */
  onDragStart?: () => boolean;
  /** Callback when drag ends */
  onDragEnd?: () => void;
  /** Name of user who has locked this performer (for collaboration) */
  lockedByUser?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PerformerMarker = React.memo<PerformerMarkerProps>(function PerformerMarker({
  performer,
  position,
  isSelected = false,
  isMultiSelected = false,
  isLocked = false,
  showLabel = true,
  showRotation = false,
  scale = 1,
  isAnimating = false,
  onSelect,
  onMove,
  onRotate,
  onContextMenu,
  onDragStart,
  onDragEnd,
  lockedByUser,
}) {
  const { t } = useTranslation('common');
  const markerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });
  const rotateStartRef = useRef<{ angle: number; rotation: number }>({
    angle: 0,
    rotation: 0,
  });

  // Handle pointer down for dragging (unified mouse + touch)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer for reliable tracking (especially touch)
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      // Select on click
      onSelect?.(performer.id, e.shiftKey || e.metaKey || e.ctrlKey);

      // Check if drag is allowed (for collaboration conflict prevention)
      if (onDragStart) {
        const allowed = onDragStart();
        if (!allowed) return;
      }

      // Start drag
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [isLocked, onSelect, onDragStart, performer.id, position.x, position.y]
  );

  // Handle pointer move during drag (unified mouse + touch)
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!markerRef.current?.parentElement) return;

      const parent = markerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();

      const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY + deltaY));

      onMove?.(performer.id, { x: newX, y: newY, rotation: position.rotation });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, performer.id, position.rotation, onMove, onDragEnd]);

  // Handle rotation drag (unified pointer events)
  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsRotating(true);
      const rect = markerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

      rotateStartRef.current = {
        angle: angle * (180 / Math.PI),
        rotation: position.rotation ?? 0,
      };
    },
    [isLocked, position.rotation]
  );

  // Handle rotation pointer move
  useEffect(() => {
    if (!isRotating) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = markerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const deltaAngle = currentAngle - rotateStartRef.current.angle;
      const newRotation = (rotateStartRef.current.rotation + deltaAngle + 360) % 360;

      onRotate?.(performer.id, newRotation);
    };

    const handlePointerUp = () => {
      setIsRotating(false);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isRotating, performer.id, onRotate]);

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(performer.id, e);
    },
    [performer.id, onContextMenu]
  );

  const markerSize = 32 * scale;
  const rotation = position.rotation ?? 0;

  return (
    <div
      ref={markerRef}
      className={`absolute select-none transition-shadow ${
        isDragging || isRotating ? 'z-50' : 'z-10'
      } ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-grab'} ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%)`,
        touchAction: 'none',
        ...(isAnimating && !isDragging ? { transition: 'left 80ms linear, top 80ms linear' } : {}),
      }}
      data-performer={performer.id}
      role="button"
      aria-label={`${performer.name}${isSelected ? ' (selected)' : ''}${isLocked ? ' (locked)' : ''}`}
      aria-pressed={isSelected}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      {/* Selection Ring — thicker border + green for multi-select, blue for single */}
      {isSelected && (
        <div
          className={`absolute rounded-full ${
            isMultiSelected
              ? 'border-[3px] border-emerald-400'
              : 'border-2 border-blue-500 animate-pulse'
          }`}
          style={{
            width: markerSize + 8,
            height: markerSize + 8,
            left: -4,
            top: -4,
          }}
        />
      )}

      {/* Direction Indicator */}
      {showRotation && (
        <div
          className="absolute bg-white rounded-full shadow-md cursor-pointer z-20 hover:bg-blue-100 transition-colors"
          style={{
            width: 12,
            height: 12,
            left: '50%',
            top: -20,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transformOrigin: `50% ${markerSize / 2 + 20}px`,
          }}
          onPointerDown={handleRotatePointerDown}
          role="slider"
          aria-label={t('formation.rotatePerformer', 'Drag to rotate')}
          aria-valuenow={rotation}
        >
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
            ↑
          </div>
        </div>
      )}

      {/* Marker Shape */}
      {(!performer.symbolShape || performer.symbolShape === 'circle') ? (
        <div
          className={`rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
            isSelected
              ? isMultiSelected
                ? 'ring-2 ring-emerald-400 ring-offset-2'
                : 'ring-2 ring-blue-500 ring-offset-2'
              : ''
          }`}
          style={{
            width: markerSize,
            height: markerSize,
            backgroundColor: performer.color,
            transform: showRotation ? `rotate(${rotation}deg)` : undefined,
          }}
          aria-label={performer.name}
        >
          {showLabel && (
            <span className="pointer-events-none">{performer.label}</span>
          )}
        </div>
      ) : (
        <svg
          width={markerSize}
          height={markerSize}
          viewBox="0 0 32 32"
          className={`shadow-lg ${isSelected ? isMultiSelected ? 'ring-2 ring-emerald-400 ring-offset-2' : 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
          style={{
            transform: showRotation ? `rotate(${rotation}deg)` : undefined,
            overflow: 'visible',
          }}
          aria-label={performer.name}
        >
          {performer.symbolShape === 'square' && (
            <rect x="2" y="2" width="28" height="28" rx="2" fill={performer.color} />
          )}
          {performer.symbolShape === 'diamond' && (
            <polygon points="16,1 31,16 16,31 1,16" fill={performer.color} />
          )}
          {performer.symbolShape === 'triangle' && (
            <polygon points="16,2 30,27 2,27" fill={performer.color} />
          )}
          {performer.symbolShape === 'cross' && (
            <path
              d="M11,2 L21,2 L21,11 L30,11 L30,21 L21,21 L21,30 L11,30 L11,21 L2,21 L2,11 L11,11 Z"
              fill={performer.color}
            />
          )}
          {showLabel && (
            <text
              x="16"
              y="16"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              className="pointer-events-none"
            >
              {performer.label}
            </text>
          )}
        </svg>
      )}

      {/* Performer Name (below marker) */}
      {showLabel && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium mt-1"
          style={{ top: markerSize }}
        >
          {performer.name}
        </div>
      )}

      {/* Group Badge */}
      {performer.group && (
        <div
          className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-gray-800 text-white text-xs rounded-full"
          style={{ fontSize: 8 }}
        >
          {performer.group}
        </div>
      )}

      {/* Locked by User Indicator */}
      {lockedByUser && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 -bottom-8 px-2 py-1 bg-amber-500 text-white text-xs rounded whitespace-nowrap shadow-md"
          style={{ fontSize: 10 }}
        >
          {t('formation.lockedBy', 'Editing: {{user}}', { user: lockedByUser })}
        </div>
      )}
    </div>
  );
});

export default PerformerMarker;
