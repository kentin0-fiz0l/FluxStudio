/**
 * TrimRegionOverlay - Renders dimmed regions outside the active trim range.
 */

import { memo } from 'react';

interface TrimRegionOverlayProps {
  containerWidth: number;
  duration: number;
  trimStartX: number;
  trimEndX: number;
  trimStartProp: number | undefined;
  trimEndProp: number | undefined;
  OVERLAY_HEIGHT: number;
}

export const TrimRegionOverlay = memo(function TrimRegionOverlay({
  containerWidth,
  duration,
  trimStartX,
  trimEndX,
  trimStartProp,
  trimEndProp,
  OVERLAY_HEIGHT,
}: TrimRegionOverlayProps) {
  if (
    containerWidth <= 0 ||
    duration <= 0 ||
    (trimStartProp === undefined && trimEndProp === undefined)
  ) {
    return null;
  }

  return (
    <>
      {/* Dimmed region before trim start */}
      {trimStartX > 0 && (
        <rect
          x={0}
          y={0}
          width={trimStartX}
          height={OVERLAY_HEIGHT}
          fill="rgba(0, 0, 0, 0.4)"
          className="pointer-events-none"
        />
      )}
      {/* Dimmed region after trim end */}
      {trimEndX < containerWidth && (
        <rect
          x={trimEndX}
          y={0}
          width={containerWidth - trimEndX}
          height={OVERLAY_HEIGHT}
          fill="rgba(0, 0, 0, 0.4)"
          className="pointer-events-none"
        />
      )}
      {/* Active region highlight border lines */}
      <line
        x1={trimStartX}
        y1={0}
        x2={trimStartX}
        y2={OVERLAY_HEIGHT}
        stroke="rgba(34, 197, 94, 0.5)"
        strokeWidth={1}
        className="pointer-events-none"
      />
      <line
        x1={trimEndX}
        y1={0}
        x2={trimEndX}
        y2={OVERLAY_HEIGHT}
        stroke="rgba(34, 197, 94, 0.5)"
        strokeWidth={1}
        className="pointer-events-none"
      />
    </>
  );
});
