/**
 * PerformerInstances - Instanced mesh rendering for performers
 *
 * Uses THREE.InstancedMesh to render up to 200+ performers in a single draw call.
 * Each performer is rendered as a capsule/cylinder with their color.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei/web/Html';
import * as THREE from 'three';
import type { Position, Performer } from '../../../services/formationTypes';

/** Map of performerId -> { color, userId } for collaborator selection highlighting */
export type CollaboratorSelections = Map<string, { color: string; userId: string }>;

interface PerformerInstancesProps {
  positions: Map<string, Position>;
  performers: Performer[];
  stageWidth: number;
  stageHeight: number;
  fieldLength: number;
  fieldWidth: number;
  showLabels: boolean;
  isAnimating?: boolean;
  /** Collaborator selections: performerId -> { color, userId } for emissive glow */
  collaboratorSelections?: CollaboratorSelections;
}

const PERFORMER_RADIUS = 0.5;
const PERFORMER_HEIGHT = 1.8;
/** Screen-space pixel threshold below which we switch to LOD dot rendering */
const LOD_PIXEL_THRESHOLD = 4;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempEmissive = new THREE.Color();
const tempVec3 = new THREE.Vector3();
const tempFrustum = new THREE.Frustum();
const tempMatrix4 = new THREE.Matrix4();
/** Pre-computed zero-scale matrix at hidden position for culled/LOD instances */
const hiddenMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(0, -100, 0),
  new THREE.Quaternion(),
  new THREE.Vector3(0, 0, 0),
);

export function PerformerInstances({
  positions,
  performers,
  stageWidth: _stageWidth,
  stageHeight: _stageHeight,
  fieldLength,
  fieldWidth,
  showLabels,
  isAnimating,
  collaboratorSelections,
}: PerformerInstancesProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch between drei and three
  const meshRef = useRef<any>(null!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- separate mesh for selection glow
  const glowMeshRef = useRef<any>(null!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LOD dot mesh
  const dotMeshRef = useRef<any>(null!);

  const { camera, size: viewportSize } = useThree();

  // Keep a ref to the latest positions so useFrame can read them without re-subscribing
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  /** Returns approximate screen-space pixel size of a performer at world position */
  const getScreenSize = useMemo(() => {
    return (wx: number, wz: number): number => {
      tempVec3.set(wx, PERFORMER_HEIGHT / 2, wz);
      const dist = camera.position.distanceTo(tempVec3);
      if (dist < 0.01) return 1000;
      // Approximate: project diameter onto screen using perspective FOV
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch between drei and three
      const fov = 'fov' in camera ? (camera as any).fov : 50;
      const vFov = (fov * Math.PI) / 180;
      const screenHeight = viewportSize.height;
      const worldToPixels = screenHeight / (2 * dist * Math.tan(vFov / 2));
      return PERFORMER_RADIUS * 2 * worldToPixels;
    };
  }, [camera, viewportSize.height]);

  // Convert normalized positions to world coordinates
  const worldPositions = useMemo(() => {
    return performers.map((p) => {
      const pos = positions.get(p.id);
      if (!pos) return { performer: p, wx: 0, wz: 0, hasPosition: false };
      const wx = (pos.x / 100) * fieldLength - fieldLength / 2;
      const wz = (pos.y / 100) * fieldWidth - fieldWidth / 2;
      return { performer: p, wx, wz, hasPosition: true, rotation: pos.rotation ?? 0 };
    });
  }, [performers, positions, fieldLength, fieldWidth]);

  // Static update: used when not animating (original behavior)
  // Applies frustum culling and LOD for large performer counts
  useEffect(() => {
    if (isAnimating) return;
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const glowMesh = glowMeshRef.current;
    const dotMesh = dotMeshRef.current;
    const useCulling = performers.length > 200;

    if (useCulling) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch between drei and three
      tempMatrix4.multiplyMatrices(camera.projectionMatrix as any, camera.matrixWorldInverse as any);
      tempFrustum.setFromProjectionMatrix(tempMatrix4);
    }

    worldPositions.forEach(({ performer, wx, wz, hasPosition, rotation }, i) => {
      if (!hasPosition) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
      } else if (useCulling) {
        tempVec3.set(wx, PERFORMER_HEIGHT / 2, wz);
        if (!tempFrustum.containsPoint(tempVec3)) {
          // Culled: outside frustum
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          mesh.setMatrixAt(i, tempObject.matrix);
          if (dotMesh) dotMesh.setMatrixAt(i, tempObject.matrix);
          if (glowMesh) glowMesh.setMatrixAt(i, tempObject.matrix);
          return;
        }
        // LOD check
        const screenPx = getScreenSize(wx, wz);
        if (screenPx < LOD_PIXEL_THRESHOLD && dotMesh) {
          // Show as dot only
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          mesh.setMatrixAt(i, tempObject.matrix);

          tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
          tempObject.scale.set(0.3, 0.3, 0.3);
          tempObject.updateMatrix();
          dotMesh.setMatrixAt(i, tempObject.matrix);
          tempColor.set(performer.color);
          dotMesh.setColorAt(i, tempColor);
          return;
        }
        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        tempObject.rotation.set(0, ((rotation ?? 0) * Math.PI) / 180, 0);
        tempObject.scale.set(1, 1, 1);
      } else {
        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        tempObject.rotation.set(0, ((rotation ?? 0) * Math.PI) / 180, 0);
        tempObject.scale.set(1, 1, 1);
      }

      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      tempColor.set(performer.color);
      mesh.setColorAt(i, tempColor);

      // Update glow mesh for collaborator selections
      if (glowMesh) {
        const selection = collaboratorSelections?.get(performer.id);
        if (hasPosition && selection) {
          tempObject.scale.set(1.25, 1.25, 1.25);
          tempObject.updateMatrix();
          glowMesh.setMatrixAt(i, tempObject.matrix);
          tempEmissive.set(selection.color);
          glowMesh.setColorAt(i, tempEmissive);
        } else {
          // Hide glow instance
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          glowMesh.setMatrixAt(i, tempObject.matrix);
        }
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (glowMesh) {
      glowMesh.instanceMatrix.needsUpdate = true;
      if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
    }
    if (dotMesh) {
      dotMesh.instanceMatrix.needsUpdate = true;
      if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    }
  }, [worldPositions, isAnimating, collaboratorSelections, camera, performers.length, getScreenSize]);

  // Animation update: per-frame instance matrix update via useFrame
  // Includes frustum culling and LOD for large performer counts
  useFrame(() => {
    if (!isAnimating || !meshRef.current) return;

    const mesh = meshRef.current;
    const dotMesh = dotMeshRef.current;
    const currentPositions = positionsRef.current;
    const useCulling = performers.length > 200;

    // Update frustum from camera for culling
    if (useCulling) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/three version mismatch between drei and three
      tempMatrix4.multiplyMatrices(camera.projectionMatrix as any, camera.matrixWorldInverse as any);
      tempFrustum.setFromProjectionMatrix(tempMatrix4);
    }

    performers.forEach((p, i) => {
      const pos = currentPositions.get(p.id);
      if (!pos) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        if (dotMesh) dotMesh.setMatrixAt(i, tempObject.matrix);
        return;
      }

      const wx = (pos.x / 100) * fieldLength - fieldLength / 2;
      const wz = (pos.y / 100) * fieldWidth - fieldWidth / 2;

      // Frustum culling: hide instances outside camera view
      if (useCulling) {
        tempVec3.set(wx, PERFORMER_HEIGHT / 2, wz);
        if (!tempFrustum.containsPoint(tempVec3)) {
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          mesh.setMatrixAt(i, tempObject.matrix);
          if (dotMesh) dotMesh.setMatrixAt(i, tempObject.matrix);
          return;
        }
      }

      // LOD: switch to dot mesh when performer is tiny on screen
      const screenPx = useCulling ? getScreenSize(wx, wz) : LOD_PIXEL_THRESHOLD + 1;
      if (screenPx < LOD_PIXEL_THRESHOLD && dotMesh) {
        // Hide from full mesh, show as dot
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        const dotScale = 0.3;
        tempObject.scale.set(dotScale, dotScale, dotScale);
        tempObject.updateMatrix();
        dotMesh.setMatrixAt(i, tempObject.matrix);

        tempColor.set(p.color);
        dotMesh.setColorAt(i, tempColor);
      } else {
        // Full detail mesh
        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        tempObject.rotation.set(0, ((pos.rotation ?? 0) * Math.PI) / 180, 0);
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        if (dotMesh) {
          dotMesh.setMatrixAt(i, hiddenMatrix);
        }
      }

      tempColor.set(p.color);
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (dotMesh) {
      dotMesh.instanceMatrix.needsUpdate = true;
      if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    }
  });

  if (performers.length === 0) return null;

  return (
    <group>
      {/* Instanced cylinders for performers */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, performers.length]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[PERFORMER_RADIUS, PERFORMER_HEIGHT - PERFORMER_RADIUS * 2, 4, 16]} />
        <meshStandardMaterial
          roughness={0.6}
          metalness={0.1}
          vertexColors
        />
      </instancedMesh>

      {/* Glow mesh for collaborator selection highlighting */}
      {collaboratorSelections && collaboratorSelections.size > 0 && (
        <instancedMesh
          ref={glowMeshRef}
          args={[undefined, undefined, performers.length]}
        >
          <capsuleGeometry args={[PERFORMER_RADIUS + 0.1, PERFORMER_HEIGHT - PERFORMER_RADIUS * 2 + 0.2, 4, 16]} />
          <meshStandardMaterial
            transparent
            opacity={0.3}
            emissiveIntensity={0.8}
            vertexColors
            emissive="#ffffff"
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* LOD dot mesh - simplified sphere for distant performers (>200 count) */}
      {performers.length > 200 && (
        <instancedMesh
          ref={dotMeshRef}
          args={[undefined, undefined, performers.length]}
        >
          <sphereGeometry args={[PERFORMER_RADIUS * 0.6, 6, 6]} />
          <meshBasicMaterial vertexColors />
        </instancedMesh>
      )}

      {/* Labels (HTML overlay) - only when enabled and manageable count */}
      {showLabels && performers.length <= 100 && worldPositions
        .filter(({ hasPosition }) => hasPosition)
        .map(({ performer, wx, wz }) => (
          <Html
            key={performer.id}
            position={[wx, PERFORMER_HEIGHT + 0.6, wz]}
            center
            distanceFactor={10}
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap select-none">
              {performer.label}
            </div>
          </Html>
        ))
      }
    </group>
  );
}
