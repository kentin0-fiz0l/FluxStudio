/**
 * FieldMesh - Football field ground plane with yard lines
 *
 * Renders a green field with white yard lines matching a standard
 * American football field layout.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

interface FieldMeshProps {
  length: number;   // 120 yards (including end zones)
  width: number;    // 53.33 yards
  showGrid: boolean;
}

export function FieldMesh({ length, width, showGrid }: FieldMeshProps) {
  const linesMesh = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Yard lines every 5 yards (from end zone to end zone)
    for (let y = 0; y <= 100; y += 5) {
      const worldZ = -length / 2 + 10 + y; // 10 yards for each end zone
      points.push(new THREE.Vector3(-width / 2, 0.02, worldZ));
      points.push(new THREE.Vector3(width / 2, 0.02, worldZ));
    }

    // Sidelines
    points.push(new THREE.Vector3(-width / 2, 0.02, -length / 2));
    points.push(new THREE.Vector3(-width / 2, 0.02, length / 2));
    points.push(new THREE.Vector3(width / 2, 0.02, -length / 2));
    points.push(new THREE.Vector3(width / 2, 0.02, length / 2));

    // End zone lines
    points.push(new THREE.Vector3(-width / 2, 0.02, -length / 2 + 10));
    points.push(new THREE.Vector3(width / 2, 0.02, -length / 2 + 10));
    points.push(new THREE.Vector3(-width / 2, 0.02, length / 2 - 10));
    points.push(new THREE.Vector3(width / 2, 0.02, length / 2 - 10));

    // Hash marks (college: 20 yards from each sideline)
    const hashInset = 20;
    for (let y = 0; y <= 100; y += 1) {
      const worldZ = -length / 2 + 10 + y;
      const hashLen = y % 5 === 0 ? 0 : 0.5;
      if (hashLen > 0) {
        // Left hash
        points.push(new THREE.Vector3(-hashInset, 0.02, worldZ - hashLen / 2));
        points.push(new THREE.Vector3(-hashInset, 0.02, worldZ + hashLen / 2));
        // Right hash
        points.push(new THREE.Vector3(hashInset, 0.02, worldZ - hashLen / 2));
        points.push(new THREE.Vector3(hashInset, 0.02, worldZ + hashLen / 2));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [length, width]);

  return (
    <group>
      {/* Green field surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[width + 4, length + 4]} />
        <meshStandardMaterial
          color="#2d5a1e"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Yard lines */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <lineSegments geometry={linesMesh as any}>
        <lineBasicMaterial color="white" linewidth={1} />
      </lineSegments>

      {/* Optional grid overlay */}
      {showGrid && (
        <gridHelper
          args={[Math.max(length, width) + 20, 40, '#5a7a4e', '#4a6a3e']}
          position={[0, 0.005, 0]}
        />
      )}
    </group>
  );
}
