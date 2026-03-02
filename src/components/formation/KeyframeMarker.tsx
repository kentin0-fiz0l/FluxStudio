import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyframe } from '../../services/formationService';
import { formatTime } from './timelineHelpers';

export function KeyframeMarker({
  keyframe,
  duration,
  isSelected,
  isFirst,
  onSelect,
  onMove,
  onRemove,
}: {
  keyframe: Keyframe;
  duration: number;
  isSelected: boolean;
  isFirst: boolean;
  onSelect: () => void;
  onMove: (timestamp: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('common');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const markerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFirst) return; // Can't move first keyframe
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        time: keyframe.timestamp,
      };
      onSelect();
    },
    [isFirst, keyframe.timestamp, onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!markerRef.current?.parentElement) return;

      const parent = markerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaTime = (deltaX / rect.width) * duration;
      const newTime = Math.max(0, Math.min(duration, dragStartRef.current.time + deltaTime));

      onMove(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onMove]);

  const position = duration > 0 ? (keyframe.timestamp / duration) * 100 : 0;

  return (
    <div
      ref={markerRef}
      role="button"
      tabIndex={0}
      className={`absolute top-0 h-full flex flex-col items-center cursor-pointer group ${
        isDragging ? 'z-50' : 'z-10'
      }`}
      style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      onMouseDown={handleMouseDown}
    >
      {/* Keyframe Diamond */}
      <div
        className={`w-3 h-3 rotate-45 ${
          isSelected
            ? 'bg-blue-500 ring-2 ring-blue-300'
            : isFirst
            ? 'bg-green-500'
            : 'bg-gray-600 group-hover:bg-gray-500'
        }`}
      />

      {/* Vertical Line */}
      <div
        className={`w-px flex-1 ${
          isSelected ? 'bg-blue-500' : 'bg-gray-400 group-hover:bg-gray-500'
        }`}
      />

      {/* Timestamp Label */}
      <div
        className={`absolute -bottom-5 text-xs whitespace-nowrap ${
          isSelected ? 'text-blue-500 font-medium' : 'text-gray-500'
        }`}
      >
        {formatTime(keyframe.timestamp)}
      </div>

      {/* Delete button (on hover, not for first keyframe) */}
      {!isFirst && isSelected && (
        <button
          className="absolute -top-6 p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('formation.removeKeyframe', 'Remove keyframe')}
        >
          ×
        </button>
      )}
    </div>
  );
}
