/**
 * PerformerInstances - Instanced mesh rendering for performers
 *
 * Uses THREE.InstancedMesh to render up to 200+ performers in a single draw call.
 * Each performer is rendered as a capsule/cylinder with their color.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Position, Performer } from '../../../services/formationTypes';

interface PerformerInstancesProps {
  positions: Map<string, Position>;
  performers: Performer[];
  stageWidth: number;
  stageHeight: number;
  fieldLength: number;
  fieldWidth: number;
  showLabels: boolean;
  isAnimating?: boolean;
}

const PERFORMER_RADIUS = 0.5;
const PERFORMER_HEIGHT = 1.8;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function PerformerInstances({
  positions,
  performers,
  stageWidth: _stageWidth,
  stageHeight: _stageHeight,
  fieldLength,
  fieldWidth,
  showLabels,
  isAnimating,
}: PerformerInstancesProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshRef = useRef<any>(null!);

  // Keep a ref to the latest positions so useFrame can read them without re-subscribing
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

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
  useEffect(() => {
    if (isAnimating) return;
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    worldPositions.forEach(({ performer, wx, wz, hasPosition, rotation }, i) => {
      if (!hasPosition) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
      } else {
        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        tempObject.rotation.set(0, ((rotation ?? 0) * Math.PI) / 180, 0);
        tempObject.scale.set(1, 1, 1);
      }

      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      tempColor.set(performer.color);
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [worldPositions, isAnimating]);

  // Animation update: per-frame instance matrix update via useFrame
  useFrame(() => {
    if (!isAnimating || !meshRef.current) return;

    const mesh = meshRef.current;
    const currentPositions = positionsRef.current;

    performers.forEach((p, i) => {
      const pos = currentPositions.get(p.id);
      if (!pos) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
      } else {
        const wx = (pos.x / 100) * fieldLength - fieldLength / 2;
        const wz = (pos.y / 100) * fieldWidth - fieldWidth / 2;
        tempObject.position.set(wx, PERFORMER_HEIGHT / 2, wz);
        tempObject.rotation.set(0, ((pos.rotation ?? 0) * Math.PI) / 180, 0);
        tempObject.scale.set(1, 1, 1);
      }

      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      tempColor.set(p.color);
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
