/**
 * Formation3DView - Main R3F Canvas for 3D formation visualization
 *
 * Renders:
 * - Football field mesh with yard lines
 * - Instanced performer markers from existing position data
 * - Scene objects (primitives, props, imported models)
 * - TransformControls for selected objects
 * - OrbitControls for camera navigation
 */

import { Suspense, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  TransformControls,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import type { Position, Performer } from '../../../services/formationTypes';
import type { SceneObject, Scene3DTool } from '../../../services/scene3d/types';
import { FieldMesh } from './FieldMesh';
import { PerformerInstances } from './PerformerInstances';
import { SceneObjectRenderer } from './SceneObjectRenderer';

// ============================================================================
// Types
// ============================================================================

interface Formation3DViewProps {
  /** Performer positions for the current keyframe */
  positions: Map<string, Position>;
  /** Performer definitions */
  performers: Performer[];
  /** Stage dimensions */
  stageWidth?: number;
  stageHeight?: number;
  /** Scene objects to render */
  sceneObjects: SceneObject[];
  /** Currently selected object ID */
  selectedObjectId: string | null;
  /** Active 3D tool */
  activeTool: Scene3DTool;
  /** Settings */
  showGrid: boolean;
  showLabels: boolean;
  showShadows: boolean;
  /** Callbacks */
  onSelectObject: (id: string | null) => void;
  onUpdateObjectPosition: (id: string, position: { x?: number; y?: number; z?: number }) => void;
}

// ============================================================================
// Constants
// ============================================================================

// World scale: 1 unit = 1 yard. Football field = 120 x 53.33 yards
const FIELD_LENGTH = 120;
const FIELD_WIDTH = 53.33;

/** Convert normalized 0-100 position to world coordinates */
function posToWorld(x: number, y: number) {
  return {
    wx: (x / 100) * FIELD_LENGTH - FIELD_LENGTH / 2,
    wz: (y / 100) * FIELD_WIDTH - FIELD_WIDTH / 2,
  };
}

// ============================================================================
// Component
// ============================================================================

export function Formation3DView({
  positions,
  performers,
  stageWidth = 40,
  stageHeight = 30,
  sceneObjects,
  selectedObjectId,
  activeTool,
  showGrid,
  showLabels,
  showShadows,
  onSelectObject,
  onUpdateObjectPosition,
}: Formation3DViewProps) {
  const selectedObject = useMemo(
    () => sceneObjects.find((o) => o.id === selectedObjectId) ?? null,
    [sceneObjects, selectedObjectId]
  );

  const transformMode = useMemo(() => {
    if (activeTool === 'rotate') return 'rotate';
    if (activeTool === 'scale') return 'scale';
    return 'translate';
  }, [activeTool]);

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-sky-200 to-sky-100 dark:from-gray-900 dark:to-gray-800">
      <Canvas
        shadows={showShadows}
        onPointerMissed={() => onSelectObject(null)}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 80, 60]} fov={50} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.05}
          minDistance={10}
          maxDistance={200}
          target={[0, 0, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[30, 50, 20]}
          intensity={0.8}
          castShadow={showShadows}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <hemisphereLight args={['#87CEEB', '#3a5f0b', 0.3]} />

        <Suspense fallback={<LoadingIndicator />}>
          {/* Field */}
          <FieldMesh
            length={FIELD_LENGTH}
            width={FIELD_WIDTH}
            showGrid={showGrid}
          />

          {/* Performers (instanced for performance) */}
          <PerformerInstances
            positions={positions}
            performers={performers}
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            fieldLength={FIELD_LENGTH}
            fieldWidth={FIELD_WIDTH}
            showLabels={showLabels}
          />

          {/* Scene Objects */}
          {sceneObjects.map((obj) => (
            <SceneObjectRenderer
              key={obj.id}
              object={obj}
              isSelected={obj.id === selectedObjectId}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              fieldLength={FIELD_LENGTH}
              fieldWidth={FIELD_WIDTH}
              onSelect={() => onSelectObject(obj.id)}
            />
          ))}

          {/* TransformControls for selected object */}
          {selectedObject && !selectedObject.locked && (
            activeTool === 'translate' || activeTool === 'rotate' || activeTool === 'scale'
          ) && (
            <TransformGizmo
              object={selectedObject}
              mode={transformMode}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              fieldLength={FIELD_LENGTH}
              fieldWidth={FIELD_WIDTH}
              onUpdate={onUpdateObjectPosition}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LoadingIndicator() {
  return (
    <Html center>
      <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-lg text-sm">
        Loading 3D scene...
      </div>
    </Html>
  );
}

interface TransformGizmoProps {
  object: SceneObject;
  mode: 'translate' | 'rotate' | 'scale';
  stageWidth: number;
  stageHeight: number;
  fieldLength: number;
  fieldWidth: number;
  onUpdate: (id: string, position: { x?: number; y?: number; z?: number }) => void;
}

function TransformGizmo({
  object,
  mode,
  stageWidth: _stageWidth,
  stageHeight: _stageHeight,
  fieldLength,
  fieldWidth,
  onUpdate,
}: TransformGizmoProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshRef = useRef<any>(null!);

  const worldPos = useMemo(() => {
    const { wx, wz } = posToWorld(object.position.x, object.position.y);
    return new THREE.Vector3(wx, object.position.z || 0, wz);
  }, [object.position]);

  return (
    <TransformControls
      mode={mode}
      position={worldPos.toArray()}
      onObjectChange={(e) => {
        if (!e) return;
        const target = e.target as unknown as { object: THREE.Object3D };
        if (!target.object) return;
        const pos = target.object.position;
        // Convert world position back to normalized 0-100
        const nx = ((pos.x + fieldLength / 2) / fieldLength) * 100;
        const ny = ((pos.z + fieldWidth / 2) / fieldWidth) * 100;
        onUpdate(object.id, {
          x: Math.round(nx * 100) / 100,
          y: Math.round(ny * 100) / 100,
          z: Math.round(pos.y * 100) / 100,
        });
      }}
    >
      <mesh ref={meshRef} visible={false}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </TransformControls>
  );
}
