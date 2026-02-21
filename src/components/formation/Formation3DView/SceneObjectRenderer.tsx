/**
 * SceneObjectRenderer - Renders a single SceneObject in the 3D scene
 *
 * Handles rendering of primitives, props, custom, and imported objects.
 * Includes selection highlight and click handling.
 */

import { useMemo, useRef } from 'react';
import { Outlines } from '@react-three/drei';
import type { SceneObject, PrimitiveSource, CustomSource } from '../../../services/scene3d/types';

interface SceneObjectRendererProps {
  object: SceneObject;
  isSelected: boolean;
  stageWidth: number;
  stageHeight: number;
  fieldLength: number;
  fieldWidth: number;
  onSelect: () => void;
}

export function SceneObjectRenderer({
  object,
  isSelected,
  stageWidth: _stageWidth,
  stageHeight: _stageHeight,
  fieldLength,
  fieldWidth,
  onSelect,
}: SceneObjectRendererProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null!);

  // Convert normalized position to world coordinates
  const worldPosition = useMemo(() => {
    const wx = (object.position.x / 100) * fieldLength - fieldLength / 2;
    const wz = (object.position.y / 100) * fieldWidth - fieldWidth / 2;
    const wy = object.position.z || 0;
    return [wx, wy, wz] as [number, number, number];
  }, [object.position, fieldLength, fieldWidth]);

  const rotation = useMemo(() => {
    return [
      ((object.position.rotationX ?? 0) * Math.PI) / 180,
      ((object.position.rotation ?? 0) * Math.PI) / 180,
      ((object.position.rotationZ ?? 0) * Math.PI) / 180,
    ] as [number, number, number];
  }, [object.position]);

  const scale = object.position.scale ?? 1;

  if (!object.visible) return null;

  return (
    <group
      ref={groupRef}
      position={worldPosition}
      rotation={rotation}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (!object.locked) onSelect();
      }}
    >
      {object.source.type === 'primitive' && (
        <PrimitiveMesh
          source={object.source}
          isSelected={isSelected}
          castShadow
        />
      )}

      {object.source.type === 'prop' && (
        <PropPlaceholder
          name={object.name}
          isSelected={isSelected}
        />
      )}

      {object.source.type === 'custom' && (
        <CustomObjectMesh
          source={object.source}
          isSelected={isSelected}
        />
      )}

      {object.source.type === 'imported' && (
        <ImportedModelPlaceholder
          name={object.name}
          isSelected={isSelected}
        />
      )}
    </group>
  );
}

// ============================================================================
// Primitive Mesh
// ============================================================================

function PrimitiveMesh({
  source,
  isSelected,
  castShadow,
}: {
  source: PrimitiveSource;
  isSelected: boolean;
  castShadow?: boolean;
}) {
  const { shape, dimensions, material } = source;

  const materialProps = useMemo(() => ({
    color: material.color,
    metalness: material.metalness ?? 0.1,
    roughness: material.roughness ?? 0.7,
    opacity: material.opacity ?? 1,
    transparent: material.transparent ?? false,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity,
  }), [material]);

  return (
    <mesh castShadow={castShadow} receiveShadow>
      {shape === 'box' && (
        <boxGeometry args={[
          dimensions.width ?? 2,
          dimensions.height ?? 2,
          dimensions.depth ?? 2,
        ]} />
      )}
      {shape === 'cylinder' && (
        <cylinderGeometry args={[
          dimensions.radiusTop ?? 1,
          dimensions.radiusBottom ?? 1,
          dimensions.height ?? 2,
          dimensions.segments ?? 32,
        ]} />
      )}
      {shape === 'sphere' && (
        <sphereGeometry args={[
          dimensions.radius ?? 1,
          dimensions.segments ?? 32,
          dimensions.segments ?? 32,
        ]} />
      )}
      {shape === 'cone' && (
        <coneGeometry args={[
          dimensions.radiusBottom ?? 1,
          dimensions.height ?? 2,
          dimensions.segments ?? 32,
        ]} />
      )}
      {shape === 'plane' && (
        <planeGeometry args={[
          dimensions.width ?? 4,
          dimensions.height ?? 4,
        ]} />
      )}
      {shape === 'torus' && (
        <torusGeometry args={[
          dimensions.radius ?? 1,
          dimensions.tubeRadius ?? 0.3,
          16,
          dimensions.segments ?? 32,
        ]} />
      )}
      <meshStandardMaterial {...materialProps} />
      {isSelected && <Outlines thickness={0.05} color="#f59e0b" />}
    </mesh>
  );
}

// ============================================================================
// Prop Placeholder (renders a colored box until GLB models are loaded)
// ============================================================================

function PropPlaceholder({ isSelected }: { name: string; isSelected: boolean }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#8b5cf6" roughness={0.6} />
      {isSelected && <Outlines thickness={0.05} color="#f59e0b" />}
    </mesh>
  );
}

// ============================================================================
// Custom Object Mesh (composed primitives)
// ============================================================================

function CustomObjectMesh({
  source,
  isSelected,
}: {
  source: CustomSource;
  isSelected: boolean;
}) {
  return (
    <group>
      {source.primitives.map((prim, i) => (
        <mesh
          key={i}
          position={[prim.position.x, prim.position.y, prim.position.z]}
          rotation={[prim.rotation.x, prim.rotation.y, prim.rotation.z]}
          scale={[prim.scale.x, prim.scale.y, prim.scale.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[
            prim.dimensions.width ?? 1,
            prim.dimensions.height ?? 1,
            prim.dimensions.depth ?? 1,
          ]} />
          <meshStandardMaterial
            color={prim.material.color}
            roughness={prim.material.roughness ?? 0.7}
            metalness={prim.material.metalness ?? 0.1}
          />
        </mesh>
      ))}
      {isSelected && (
        <mesh visible={false}>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial />
          <Outlines thickness={0.05} color="#f59e0b" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Imported Model Placeholder
// ============================================================================

function ImportedModelPlaceholder({ isSelected }: { name: string; isSelected: boolean }) {
  return (
    <mesh castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#06b6d4" roughness={0.5} metalness={0.2} />
      {isSelected && <Outlines thickness={0.05} color="#f59e0b" />}
    </mesh>
  );
}
