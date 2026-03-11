/**
 * DepthBlurEffect - Applies CSS blur to the batch canvas layer for non-selected performers.
 *
 * Rather than rendering its own overlay, this component returns a style object
 * that the CanvasEffectsLayer applies to a wrapper around the canvas content.
 * When enabled, non-selected performers rendered on the batch canvas appear blurred,
 * while selected performers (rendered as DOM elements above) stay crisp.
 */

import React from 'react';

interface DepthBlurEffectProps {
  enabled: boolean;
  intensity: number; // 0-10, blur px
  selectedPerformerIds: Set<string>;
}

export const DepthBlurEffect = React.memo<DepthBlurEffectProps>(
  function DepthBlurEffect({ enabled, intensity }) {
    if (!enabled || intensity <= 0) return null;

    // Overlay that applies backdrop-filter blur to everything below it (z-index 5 = batch canvas)
    // Positioned between batch canvas (z:5) and DOM performer markers (z:10+)
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 6,
          backdropFilter: `blur(${intensity}px)`,
          WebkitBackdropFilter: `blur(${intensity}px)`,
          opacity: 0.6,
        }}
        aria-hidden="true"
      />
    );
  },
);
