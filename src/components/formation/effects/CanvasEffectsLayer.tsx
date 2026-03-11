/**
 * CanvasEffectsLayer - Wrapper that renders all visual effect overlays.
 *
 * This component is imported by the FormationCanvas parent (index.tsx)
 * and placed alongside the CanvasRenderer. It reads canvas effects state
 * from the store and renders the appropriate effect components.
 */

import React from 'react';
import { useCanvasEffects } from '../../../store/slices/canvasEffectsSlice';
import { DepthBlurEffect } from './DepthBlurEffect';
import { SectionGlowEffect } from './SectionGlowEffect';
import { HeatMapOverlay } from './HeatMapOverlay';
import { SpotlightEffect } from './SpotlightEffect';
import { SpeedGradientOverlay } from './SpeedGradientOverlay';
import type { Performer, Position } from '../../../services/formationTypes';

interface CanvasEffectsLayerProps {
  performers: Performer[];
  positions: Map<string, Position>;
  selectedPerformerIds: Set<string>;
  performerPaths: Map<string, { time: number; position: Position }[]>;
  keyframePositions?: Map<string, Position>[];
  canvasWidth: number;
  canvasHeight: number;
}

export const CanvasEffectsLayer = React.memo<CanvasEffectsLayerProps>(
  function CanvasEffectsLayer({
    performers,
    positions,
    selectedPerformerIds,
    performerPaths,
    keyframePositions,
    canvasWidth,
    canvasHeight,
  }) {
    const effects = useCanvasEffects();

    const anyEnabled =
      effects.depthBlurEnabled ||
      effects.sectionGlowEnabled ||
      effects.heatMapEnabled ||
      effects.spotlightEnabled ||
      effects.speedGradientsEnabled;

    if (!anyEnabled) return null;

    return (
      <>
        <HeatMapOverlay
          enabled={effects.heatMapEnabled}
          mode={effects.heatMapMode}
          opacity={effects.heatMapOpacity}
          performers={performers}
          positions={positions}
          keyframePositions={keyframePositions}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
        <SectionGlowEffect
          enabled={effects.sectionGlowEnabled}
          intensity={effects.sectionGlowIntensity}
          performers={performers}
          positions={positions}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
        <DepthBlurEffect
          enabled={effects.depthBlurEnabled}
          intensity={effects.depthBlurIntensity}
          selectedPerformerIds={selectedPerformerIds}
        />
        <SpotlightEffect
          enabled={effects.spotlightEnabled}
          dimOpacity={effects.spotlightDimOpacity}
          selectedPerformerIds={selectedPerformerIds}
        />
        <SpeedGradientOverlay
          enabled={effects.speedGradientsEnabled}
          opacity={effects.speedGradientOpacity}
          performerPaths={performerPaths}
          selectedPerformerIds={selectedPerformerIds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      </>
    );
  },
);
