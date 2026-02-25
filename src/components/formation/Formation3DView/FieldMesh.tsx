/**
 * FieldMesh - Field ground plane with markings for multiple field types
 *
 * Supports:
 * - Football: Standard American football field with yard lines, hash marks, end zones
 * - Indoor: Simplified indoor field with blue/red end zones
 * - Gymnasium: Basketball court lines on hardwood
 * - Custom: Plain field with border only
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { FieldType } from '../../../services/scene3d/types';

interface FieldMeshProps {
  length: number;
  width: number;
  fieldType?: FieldType;
  showGrid: boolean;
}

// ============================================================================
// Line builders per field type
// ============================================================================

function buildFootballLines(length: number, width: number): THREE.BufferGeometry {
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

  return new THREE.BufferGeometry().setFromPoints(points);
}

function buildIndoorLines(length: number, width: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const halfL = length / 2;
  const halfW = width / 2;

  // Boundary
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));

  // Yard lines every 5 yards
  const playableLength = length - 20; // 10-yard end zones each side
  for (let y = 0; y <= playableLength; y += 5) {
    const worldZ = -halfL + 10 + y;
    points.push(new THREE.Vector3(-halfW, 0.02, worldZ));
    points.push(new THREE.Vector3(halfW, 0.02, worldZ));
  }

  // End zone lines
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL + 10));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL + 10));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL - 10));
  points.push(new THREE.Vector3(halfW, 0.02, halfL - 10));

  // Center line
  points.push(new THREE.Vector3(-halfW, 0.02, 0));
  points.push(new THREE.Vector3(halfW, 0.02, 0));

  return new THREE.BufferGeometry().setFromPoints(points);
}

function buildGymnasiumLines(length: number, width: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const halfL = length / 2;
  const halfW = width / 2;

  // Outer boundary (court outline)
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));

  // Center line
  points.push(new THREE.Vector3(-halfW, 0.02, 0));
  points.push(new THREE.Vector3(halfW, 0.02, 0));

  // Center circle (approximated with segments)
  const centerRadius = length * 0.065; // ~6 feet radius scaled
  const segments = 32;
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle1) * centerRadius, 0.02, Math.sin(angle1) * centerRadius));
    points.push(new THREE.Vector3(Math.cos(angle2) * centerRadius, 0.02, Math.sin(angle2) * centerRadius));
  }

  // Three-point arcs and key areas (both ends)
  const keyWidth = width * 0.24;   // ~12 feet scaled to court width
  const keyLength = length * 0.2;  // ~19 feet scaled to court length
  for (const sign of [-1, 1]) {
    const endZ = sign * halfL;
    const keyEndZ = endZ - sign * keyLength;

    // Key (paint) rectangle
    points.push(new THREE.Vector3(-keyWidth / 2, 0.02, endZ));
    points.push(new THREE.Vector3(-keyWidth / 2, 0.02, keyEndZ));
    points.push(new THREE.Vector3(keyWidth / 2, 0.02, endZ));
    points.push(new THREE.Vector3(keyWidth / 2, 0.02, keyEndZ));
    points.push(new THREE.Vector3(-keyWidth / 2, 0.02, keyEndZ));
    points.push(new THREE.Vector3(keyWidth / 2, 0.02, keyEndZ));

    // Free-throw circle at end of key
    const ftRadius = keyWidth / 2;
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(angle1) * ftRadius, 0.02, keyEndZ + Math.sin(angle1) * ftRadius)
      );
      points.push(
        new THREE.Vector3(Math.cos(angle2) * ftRadius, 0.02, keyEndZ + Math.sin(angle2) * ftRadius)
      );
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

function buildCustomLines(length: number, width: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const halfL = length / 2;
  const halfW = width / 2;

  // Simple boundary rectangle
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(halfW, 0.02, -halfL));
  points.push(new THREE.Vector3(-halfW, 0.02, halfL));
  points.push(new THREE.Vector3(halfW, 0.02, halfL));

  // Center line
  points.push(new THREE.Vector3(-halfW, 0.02, 0));
  points.push(new THREE.Vector3(halfW, 0.02, 0));

  return new THREE.BufferGeometry().setFromPoints(points);
}

// ============================================================================
// Field colors per type
// ============================================================================

const FIELD_COLORS: Record<FieldType, { surface: string; lineColor: string }> = {
  football: { surface: '#2d5a1e', lineColor: 'white' },
  indoor: { surface: '#1a4a2a', lineColor: 'white' },
  gymnasium: { surface: '#c4873b', lineColor: '#ffffff' },
  custom: { surface: '#3a6b3a', lineColor: 'white' },
};

// ============================================================================
// Component
// ============================================================================

export function FieldMesh({ length, width, fieldType = 'football', showGrid }: FieldMeshProps) {
  const linesMesh = useMemo(() => {
    switch (fieldType) {
      case 'indoor':
        return buildIndoorLines(length, width);
      case 'gymnasium':
        return buildGymnasiumLines(length, width);
      case 'custom':
        return buildCustomLines(length, width);
      case 'football':
      default:
        return buildFootballLines(length, width);
    }
  }, [length, width, fieldType]);

  const colors = FIELD_COLORS[fieldType];

  return (
    <group>
      {/* Field surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[width + 4, length + 4]} />
        <meshStandardMaterial
          color={colors.surface}
          roughness={fieldType === 'gymnasium' ? 0.6 : 0.9}
          metalness={fieldType === 'gymnasium' ? 0.05 : 0}
        />
      </mesh>

      {/* Indoor field end zone overlays */}
      {fieldType === 'indoor' && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.001, -length / 2 + 5]}
            receiveShadow
          >
            <planeGeometry args={[width, 10]} />
            <meshStandardMaterial color="#1a3a8a" roughness={0.9} metalness={0} opacity={0.6} transparent />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.001, length / 2 - 5]}
            receiveShadow
          >
            <planeGeometry args={[width, 10]} />
            <meshStandardMaterial color="#8a1a1a" roughness={0.9} metalness={0} opacity={0.6} transparent />
          </mesh>
        </>
      )}

      {/* Field lines */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <lineSegments geometry={linesMesh as any}>
        <lineBasicMaterial color={colors.lineColor} linewidth={1} />
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
