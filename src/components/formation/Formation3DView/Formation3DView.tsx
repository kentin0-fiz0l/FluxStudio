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

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  TransformControls,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import type { Position, Performer, Keyframe, TransitionType } from '../../../services/formationTypes';
import type { SceneObject, Scene3DTool, CameraPreset, FieldType } from '../../../services/scene3d/types';
import { FIELD_DIMENSIONS } from '../../../services/scene3d/types';
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
  /** Animation playback */
  currentTime?: number;
  keyframes?: Keyframe[];
  isAnimating?: boolean;
  /** Camera preset to animate to */
  cameraPreset?: CameraPreset | null;
  /** Field type */
  fieldType?: FieldType;
  /** Custom field dimensions (used when fieldType is 'custom') */
  customFieldWidth?: number;
  customFieldLength?: number;
  /** Callbacks */
  onSelectObject: (id: string | null) => void;
  onUpdateObjectPosition: (id: string, position: { x?: number; y?: number; z?: number }) => void;
}

// ============================================================================
// Constants
// ============================================================================

// Default world scale: 1 unit = 1 yard. Football field = 120 x 53.33 yards
const DEFAULT_FIELD_LENGTH = 120;
const DEFAULT_FIELD_WIDTH = 53.33;

/** Resolve field dimensions from field type */
function getFieldDimensions(
  fieldType: FieldType = 'football',
  customLength?: number,
  customWidth?: number
): { length: number; width: number } {
  if (fieldType === 'custom') {
    return {
      length: customLength ?? DEFAULT_FIELD_LENGTH,
      width: customWidth ?? DEFAULT_FIELD_WIDTH,
    };
  }
  const dims = FIELD_DIMENSIONS[fieldType];
  return { length: dims.length, width: dims.width };
}

/** Convert normalized 0-100 position to world coordinates */
function posToWorld(x: number, y: number, fieldLength: number, fieldWidth: number) {
  return {
    wx: (x / 100) * fieldLength - fieldLength / 2,
    wz: (y / 100) * fieldWidth - fieldWidth / 2,
  };
}

// ============================================================================
// Animation helpers (matches formationService easing/interpolation logic)
// ============================================================================

function applyEasing(t: number, easing: TransitionType | undefined): number {
  switch (easing) {
    case 'ease':
      return t * t * (3 - 2 * t);
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear':
    default:
      return t;
  }
}

function interpolateRotation(from: number, to: number, t: number): number {
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (from + diff * t + 360) % 360;
}

function interpolatePositions(
  keyframes: Keyframe[],
  currentTime: number
): Map<string, Position> {
  if (keyframes.length === 0) return new Map();

  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[0];

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].timestamp <= currentTime) {
      prevKeyframe = keyframes[i];
    }
    if (keyframes[i].timestamp >= currentTime) {
      nextKeyframe = keyframes[i];
      break;
    }
  }

  if (prevKeyframe.id === nextKeyframe.id || prevKeyframe.timestamp === currentTime) {
    return new Map(prevKeyframe.positions);
  }

  const progress =
    (currentTime - prevKeyframe.timestamp) /
    (nextKeyframe.timestamp - prevKeyframe.timestamp);
  const easedProgress = applyEasing(progress, nextKeyframe.transition ?? 'linear');

  const result = new Map<string, Position>();
  const performerIds = new Set([
    ...prevKeyframe.positions.keys(),
    ...nextKeyframe.positions.keys(),
  ]);

  for (const performerId of performerIds) {
    const prevPos = prevKeyframe.positions.get(performerId);
    const nextPos = nextKeyframe.positions.get(performerId);

    if (prevPos && nextPos) {
      result.set(performerId, {
        x: prevPos.x + (nextPos.x - prevPos.x) * easedProgress,
        y: prevPos.y + (nextPos.y - prevPos.y) * easedProgress,
        rotation: interpolateRotation(
          prevPos.rotation ?? 0,
          nextPos.rotation ?? 0,
          easedProgress
        ),
      });
    } else if (prevPos) {
      result.set(performerId, { ...prevPos });
    } else if (nextPos) {
      result.set(performerId, { ...nextPos });
    }
  }

  return result;
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
  currentTime,
  keyframes,
  isAnimating,
  cameraPreset,
  fieldType = 'football',
  customFieldWidth,
  customFieldLength,
  onSelectObject,
  onUpdateObjectPosition,
}: Formation3DViewProps) {
  const { length: fieldLength, width: fieldWidth } = useMemo(
    () => getFieldDimensions(fieldType, customFieldLength, customFieldWidth),
    [fieldType, customFieldLength, customFieldWidth]
  );

  // When animating, interpolate positions from keyframes; otherwise use static positions
  const activePositions = useMemo(() => {
    if (isAnimating && keyframes && keyframes.length > 0 && currentTime !== undefined) {
      return interpolatePositions(keyframes, currentTime);
    }
    return positions;
  }, [isAnimating, keyframes, currentTime, positions]);

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

        {/* Camera preset animator */}
        {cameraPreset && <CameraPresetAnimator preset={cameraPreset} />}

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
            length={fieldLength}
            width={fieldWidth}
            fieldType={fieldType}
            showGrid={showGrid}
          />

          {/* Performers (instanced for performance) */}
          <PerformerInstances
            positions={activePositions}
            performers={performers}
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            fieldLength={fieldLength}
            fieldWidth={fieldWidth}
            showLabels={showLabels}
            isAnimating={isAnimating}
          />

          {/* Scene Objects */}
          {sceneObjects.map((obj) => (
            <SceneObjectRenderer
              key={obj.id}
              object={obj}
              isSelected={obj.id === selectedObjectId}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              fieldLength={fieldLength}
              fieldWidth={fieldWidth}
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
              fieldLength={fieldLength}
              fieldWidth={fieldWidth}
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

/** Smoothly animates the camera to a preset position using lerp each frame */
function CameraPresetAnimator({ preset }: { preset: CameraPreset }) {
  const { camera } = useThree();
  const controlsRef = useThree((state) => state.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const targetPos = useRef(new THREE.Vector3(...preset.position));
  const targetLookAt = useRef(new THREE.Vector3(...preset.target));
  const progress = useRef(0);

  useEffect(() => {
    targetPos.current.set(...preset.position);
    targetLookAt.current.set(...preset.target);
    progress.current = 0;
  }, [preset]);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;

    progress.current = Math.min(progress.current + delta * 2, 1);
    const t = progress.current * progress.current * (3 - 2 * progress.current); // smoothstep

    camera.position.lerp(targetPos.current, t * 0.1 + 0.02);

    if (controlsRef) {
      controlsRef.target.lerp(targetLookAt.current, t * 0.1 + 0.02);
      controlsRef.update();
    }
  });

  return null;
}

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
    const { wx, wz } = posToWorld(object.position.x, object.position.y, fieldLength, fieldWidth);
    return new THREE.Vector3(wx, object.position.z || 0, wz);
  }, [object.position, fieldLength, fieldWidth]);

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
