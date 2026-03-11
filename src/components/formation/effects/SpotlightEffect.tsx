/**
 * SpotlightEffect - Dims non-selected performers by overlaying a semi-transparent layer.
 *
 * When enabled, the batch canvas layer (non-interactive performers) is dimmed.
 * Selected performers render as DOM elements above this overlay and remain bright.
 */

import React from 'react';

interface SpotlightEffectProps {
  enabled: boolean;
  dimOpacity: number; // 0-1, how opaque the dim overlay is
  selectedPerformerIds: Set<string>;
}

export const SpotlightEffect = React.memo<SpotlightEffectProps>(
  function SpotlightEffect({ enabled, dimOpacity, selectedPerformerIds }) {
    if (!enabled || selectedPerformerIds.size === 0) return null;

    // Dark overlay positioned between batch canvas (z:5) and DOM markers (z:10+)
    return (
      <div
        className="absolute inset-0 pointer-events-none bg-black"
        style={{
          zIndex: 6,
          opacity: dimOpacity,
        }}
        aria-hidden="true"
      />
    );
  },
);
