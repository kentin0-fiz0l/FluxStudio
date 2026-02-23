/**
 * ObjectEditorModal - Modal for editing scene object properties
 *
 * Allows editing name, position, rotation, scale, material, and visibility.
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Lock, Unlock, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui';
import type { SceneObject, MaterialConfig, Position3D } from '../../services/scene3d/types';

interface ObjectEditorModalProps {
  object: SceneObject | null;
  onUpdate: (id: string, updates: Partial<Omit<SceneObject, 'id'>>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: () => void;
}

export function ObjectEditorModal({ object, onUpdate, onRemove, onDuplicate, onClose }: ObjectEditorModalProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position3D>({ x: 50, y: 50, z: 0 });

  useEffect(() => {
    if (object) {
      setName(object.name);
      setPosition({ ...object.position });
    }
  }, [object]);

  if (!object) return null;

  const handlePositionChange = (key: keyof Position3D, value: number) => {
    const updated = { ...position, [key]: value };
    setPosition(updated);
    onUpdate(object.id, { position: updated });
  };

  const getMaterial = (): MaterialConfig | null => {
    if (object.source.type === 'primitive') return object.source.material;
    return null;
  };

  const material = getMaterial();

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Object Properties</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onUpdate(object.id, { name: e.target.value });
            }}
            className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
          />
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Type:</span>
          <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
            {object.type}
          </span>
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Position</label>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <span className="text-[10px] text-gray-400 uppercase">{axis}</span>
                <input
                  type="number"
                  step={0.1}
                  value={position[axis] ?? 0}
                  onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Rotation</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['rotationX', 'X'],
              ['rotation', 'Y'],
              ['rotationZ', 'Z'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <span className="text-[10px] text-gray-400 uppercase">{label}</span>
                <input
                  type="number"
                  step={5}
                  value={position[key] ?? 0}
                  onChange={(e) => handlePositionChange(key, parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Scale</label>
          <input
            type="number"
            step={0.1}
            min={0.1}
            max={10}
            value={position.scale ?? 1}
            onChange={(e) => handlePositionChange('scale', parseFloat(e.target.value) || 1)}
            className="w-24 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
          />
        </div>

        {/* Material (for primitives) */}
        {material && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Material</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Color</span>
                <input
                  type="color"
                  value={material.color}
                  onChange={(e) => {
                    if (object.source.type === 'primitive') {
                      onUpdate(object.id, {
                        source: { ...object.source, material: { ...material, color: e.target.value } },
                      });
                    }
                  }}
                  className="w-8 h-6 border border-gray-200 dark:border-gray-700 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Metalness</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={material.metalness ?? 0.1}
                  onChange={(e) => {
                    if (object.source.type === 'primitive') {
                      onUpdate(object.id, {
                        source: { ...object.source, material: { ...material, metalness: parseFloat(e.target.value) } },
                      });
                    }
                  }}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Roughness</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={material.roughness ?? 0.7}
                  onChange={(e) => {
                    if (object.source.type === 'primitive') {
                      onUpdate(object.id, {
                        source: { ...object.source, material: { ...material, roughness: parseFloat(e.target.value) } },
                      });
                    }
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
        <button
          onClick={() => onUpdate(object.id, { visible: !object.visible })}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          title={object.visible ? 'Hide' : 'Show'}
        >
          {object.visible ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
        </button>
        <button
          onClick={() => onUpdate(object.id, { locked: !object.locked })}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          title={object.locked ? 'Unlock' : 'Lock'}
        >
          {object.locked ? <Lock className="w-4 h-4" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
        </button>
        <button
          onClick={() => onDuplicate(object.id)}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(object.id)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </div>
  );
}
