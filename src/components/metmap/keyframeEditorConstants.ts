import type { AnimatableProperty, EasingType, BezierHandles } from '../../contexts/metmap/types';

export const PROPERTY_CONFIG: Record<AnimatableProperty, { label: string; color: string; min: number; max: number; unit: string }> = {
  tempo: { label: 'Tempo', color: '#818cf8', min: 20, max: 300, unit: 'BPM' },
  volume: { label: 'Volume', color: '#34d399', min: 0, max: 100, unit: '%' },
  pan: { label: 'Pan', color: '#fbbf24', min: -100, max: 100, unit: '' },
  emphasis: { label: 'Emphasis', color: '#fb7185', min: 0, max: 100, unit: '%' },
};

export const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In-Out' },
  { value: 'step', label: 'Step' },
  { value: 'bezier', label: 'Bezier' },
];

export const DEFAULT_BEZIER_HANDLES: BezierHandles = { cp1x: 0.42, cp1y: 0, cp2x: 0.58, cp2y: 1 };

export const TRACK_HEIGHT = 48;

let nextId = 0;
export function generateId(): string {
  return `kf_${Date.now()}_${nextId++}`;
}
