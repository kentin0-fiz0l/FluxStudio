/**
 * FlyThroughController - Animated camera path through the 3D view during playback
 *
 * Renders inside a React Three Fiber Canvas and drives the camera along
 * a CatmullRomCurve3 built from preset or custom waypoints.
 * When enabled, OrbitControls should be disabled externally.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface CameraWaypoint {
  position: [number, number, number];
  lookAt: [number, number, number];
  /** Normalized time 0-1 through the playback */
  time: number;
}

export type FlyThroughPreset =
  | 'audience_sweep'
  | 'overhead'
  | 'director_tower'
  | 'custom';

export interface FlyThroughControllerProps {
  enabled: boolean;
  preset: FlyThroughPreset;
  customWaypoints?: CameraWaypoint[];
  /** Normalized playback progress 0-1 */
  playbackProgress: number;
}

// ============================================================================
// Preset waypoint definitions
// ============================================================================

const PRESET_WAYPOINTS: Record<Exclude<FlyThroughPreset, 'custom'>, CameraWaypoint[]> = {
  audience_sweep: [
    { position: [0, 2, 20], lookAt: [0, 0, 0], time: 0 },
    { position: [15, 5, 15], lookAt: [0, 0, 0], time: 0.33 },
    { position: [0, 15, 5], lookAt: [0, 0, 0], time: 0.66 },
    { position: [0, 2, 20], lookAt: [0, 0, 0], time: 1 },
  ],
  overhead: [
    { position: [0, 20, 0.1], lookAt: [0, 0, 0], time: 0 },
    { position: [5, 20, 2], lookAt: [0, 0, 0], time: 0.5 },
    { position: [-5, 20, -2], lookAt: [0, 0, 0], time: 1 },
  ],
  director_tower: [
    { position: [0, 8, 18], lookAt: [0, 0, 0], time: 0 },
    { position: [2, 8, 18], lookAt: [-3, 0, -2], time: 0.25 },
    { position: [0, 8, 18], lookAt: [3, 0, 2], time: 0.5 },
    { position: [-2, 8, 18], lookAt: [0, 0, -3], time: 0.75 },
    { position: [0, 8, 18], lookAt: [0, 0, 0], time: 1 },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

function buildCurve(waypoints: CameraWaypoint[]): THREE.CatmullRomCurve3 {
  const points = waypoints.map((wp) => new THREE.Vector3(...wp.position));
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

function buildLookAtCurve(waypoints: CameraWaypoint[]): THREE.CatmullRomCurve3 {
  const points = waypoints.map((wp) => new THREE.Vector3(...wp.lookAt));
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

// ============================================================================
// Component
// ============================================================================

export function FlyThroughController({
  enabled,
  preset,
  customWaypoints,
  playbackProgress,
}: FlyThroughControllerProps) {
  const { camera } = useThree();
  const prevEnabled = useRef(false);
  const savedCameraPos = useRef(new THREE.Vector3());
  const savedCameraTarget = useRef(new THREE.Vector3(0, 0, 0));

  const waypoints = useMemo(() => {
    if (preset === 'custom' && customWaypoints && customWaypoints.length >= 2) {
      return customWaypoints;
    }
    return PRESET_WAYPOINTS[preset === 'custom' ? 'audience_sweep' : preset];
  }, [preset, customWaypoints]);

  const positionCurve = useMemo(() => buildCurve(waypoints), [waypoints]);
  const lookAtCurve = useMemo(() => buildLookAtCurve(waypoints), [waypoints]);

  // Save/restore camera position when enabling/disabling
  useEffect(() => {
    if (enabled && !prevEnabled.current) {
      savedCameraPos.current.copy(camera.position as unknown as THREE.Vector3);
    }
    if (!enabled && prevEnabled.current) {
      camera.position.set(
        savedCameraPos.current.x,
        savedCameraPos.current.y,
        savedCameraPos.current.z,
      );
      camera.lookAt(
        savedCameraTarget.current.x,
        savedCameraTarget.current.y,
        savedCameraTarget.current.z,
      );
    }
    prevEnabled.current = enabled;
  }, [enabled, camera]);

  useFrame(() => {
    if (!enabled) return;

    const t = Math.max(0, Math.min(1, playbackProgress));
    const pos = positionCurve.getPointAt(t);
    const lookAtTarget = lookAtCurve.getPointAt(t);

    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
    savedCameraTarget.current.set(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
  });

  return null;
}
