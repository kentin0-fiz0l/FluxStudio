/**
 * MobileSetNavigator - Top strip with horizontal scroll/swipe between sets.
 *
 * Shows set name + performer count for each keyframe. Tap to jump.
 * Horizontal scrollable flex container with snap behavior.
 */

import React, { useRef, useEffect } from 'react';
import type { Keyframe } from '../../../services/formationTypes';

interface MobileSetNavigatorProps {
  keyframes: Keyframe[];
  selectedKeyframeId: string;
  onKeyframeSelect: (keyframeId: string) => void;
}

export const MobileSetNavigator: React.FC<MobileSetNavigatorProps> = React.memo(({
  keyframes,
  selectedKeyframeId,
  onKeyframeSelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected keyframe into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const selected = scrollRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedKeyframeId]);

  if (keyframes.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none snap-x snap-mandatory"
        role="tablist"
        aria-label="Formation sets"
      >
        {keyframes.map((kf, index) => {
          const isSelected = kf.id === selectedKeyframeId;
          const performerCount = kf.positions.size;

          return (
            <button
              key={kf.id}
              data-selected={isSelected}
              onClick={() => onKeyframeSelect(kf.id)}
              className={`
                snap-center shrink-0 flex flex-col items-center justify-center
                min-w-[72px] min-h-[44px] px-3 py-1.5 rounded-lg
                text-xs font-medium transition-colors
                ${isSelected
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600'
                }
              `}
              role="tab"
              aria-selected={isSelected}
              aria-label={`Set ${index + 1}, ${performerCount} performers`}
            >
              <span className="font-semibold">Set {index + 1}</span>
              <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {performerCount} {performerCount === 1 ? 'dot' : 'dots'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

MobileSetNavigator.displayName = 'MobileSetNavigator';
