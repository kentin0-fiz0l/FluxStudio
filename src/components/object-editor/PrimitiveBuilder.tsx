/**
 * PrimitiveBuilder - Compose multiple primitives into a custom object
 *
 * Mini R3F canvas with add/transform/material controls for building
 * compound objects from basic shapes.
 */

import { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Outlines } from '@react-three/drei';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui';
import type {
  ComposedPrimitive,
  PrimitiveShape,
} from '../../services/scene3d/types';
import { DEFAULT_MATERIAL } from '../../services/scene3d/types';

interface PrimitiveBuilderProps {
  onSave: (name: string, primitives: ComposedPrimitive[]) => void;
  onClose: () => void;
}

const SHAPE_OPTIONS: { value: PrimitiveShape; label: string }[] = [
  { value: 'box', label: 'Box' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'cone', label: 'Cone' },
  { value: 'plane', label: 'Plane' },
  { value: 'torus', label: 'Torus' },
];

function generatePrimitiveId(): string {
  return `prim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultPrimitive(shape: PrimitiveShape): ComposedPrimitive {
  return {
    id: generatePrimitiveId(),
    shape,
    dimensions: {
      width: 1,
      height: 1,
      depth: 1,
      radius: 0.5,
      radiusTop: 0.5,
      radiusBottom: 0.5,
      tubeRadius: 0.2,
      segments: 32,
    },
    material: { ...DEFAULT_MATERIAL },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

export function PrimitiveBuilder({ onSave, onClose }: PrimitiveBuilderProps) {
  const [name, setName] = useState('Custom Object');
  const [primitives, setPrimitives] = useState<ComposedPrimitive[]>([
    createDefaultPrimitive('box'),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(primitives[0]?.id ?? null);

  const selectedPrimitive = primitives.find((p) => p.id === selectedId) ?? null;

  const addPrimitive = useCallback((shape: PrimitiveShape) => {
    const prim = createDefaultPrimitive(shape);
    setPrimitives((prev) => [...prev, prim]);
    setSelectedId(prim.id);
  }, []);

  const removePrimitive = useCallback((id: string) => {
    setPrimitives((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((prevSelected) => (prevSelected === id ? null : prevSelected));
  }, []);

  const updatePrimitive = useCallback((id: string, updates: Partial<ComposedPrimitive>) => {
    setPrimitives((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Primitive Builder</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
              placeholder="Object name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onSave(name, primitives)}
              disabled={primitives.length === 0}
            >
              <Save className="w-4 h-4 mr-1" aria-hidden="true" />
              Save Object
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Primitive list */}
          <div className="w-56 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Add Shape</p>
              <div className="flex flex-wrap gap-1">
                {SHAPE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => addPrimitive(value)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {primitives.map((prim) => (
                <div
                  key={prim.id}
                  onClick={() => setSelectedId(prim.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer ${
                    prim.id === selectedId
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="truncate">{prim.shape}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removePrimitive(prim.id); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Center: 3D Preview */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            <Canvas shadows>
              <PerspectiveCamera makeDefault position={[3, 3, 3]} />
              <OrbitControls />
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
              <gridHelper args={[10, 10, '#ccc', '#eee']} />
              <Suspense fallback={null}>
                {primitives.map((prim) => (
                  <BuilderPrimitiveMesh
                    key={prim.id}
                    primitive={prim}
                    isSelected={prim.id === selectedId}
                    onClick={() => setSelectedId(prim.id)}
                  />
                ))}
              </Suspense>
            </Canvas>
          </div>

          {/* Right: Properties */}
          {selectedPrimitive && (
            <div className="w-56 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-3 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Properties</h4>

              {/* Color */}
              <div>
                <label className="text-xs text-gray-400">Color</label>
                <input
                  type="color"
                  value={selectedPrimitive.material.color}
                  onChange={(e) =>
                    updatePrimitive(selectedPrimitive.id, {
                      material: { ...selectedPrimitive.material, color: e.target.value },
                    })
                  }
                  className="w-full h-8 border rounded cursor-pointer"
                />
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-gray-400">Position</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <input
                      key={axis}
                      type="number"
                      step={0.1}
                      value={selectedPrimitive.position[axis]}
                      onChange={(e) =>
                        updatePrimitive(selectedPrimitive.id, {
                          position: { ...selectedPrimitive.position, [axis]: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="px-1 py-0.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                      placeholder={axis.toUpperCase()}
                    />
                  ))}
                </div>
              </div>

              {/* Scale */}
              <div>
                <label className="text-xs text-gray-400">Scale</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <input
                      key={axis}
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={selectedPrimitive.scale[axis]}
                      onChange={(e) =>
                        updatePrimitive(selectedPrimitive.id, {
                          scale: { ...selectedPrimitive.scale, [axis]: parseFloat(e.target.value) || 1 },
                        })
                      }
                      className="px-1 py-0.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                      placeholder={axis.toUpperCase()}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Builder Preview Mesh
// ============================================================================

function BuilderPrimitiveMesh({
  primitive,
  isSelected,
  onClick,
}: {
  primitive: ComposedPrimitive;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <mesh
      position={[primitive.position.x, primitive.position.y, primitive.position.z]}
      rotation={[primitive.rotation.x, primitive.rotation.y, primitive.rotation.z]}
      scale={[primitive.scale.x, primitive.scale.y, primitive.scale.z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      castShadow
    >
      {primitive.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {primitive.shape === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
      {primitive.shape === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
      {primitive.shape === 'cone' && <coneGeometry args={[0.5, 1, 32]} />}
      {primitive.shape === 'plane' && <planeGeometry args={[1, 1]} />}
      {primitive.shape === 'torus' && <torusGeometry args={[0.5, 0.2, 16, 32]} />}
      <meshStandardMaterial
        color={primitive.material.color}
        metalness={primitive.material.metalness ?? 0.1}
        roughness={primitive.material.roughness ?? 0.7}
      />
      {isSelected && <Outlines thickness={0.04} color="#f59e0b" />}
    </mesh>
  );
}
