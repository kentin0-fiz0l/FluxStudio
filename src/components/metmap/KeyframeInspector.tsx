import { Plus, Trash2 } from 'lucide-react';
import type { Animation, AnimatableProperty, EasingType, Keyframe } from '../../contexts/metmap/types';
import { PROPERTY_CONFIG, EASING_OPTIONS } from './keyframeEditorConstants';

interface KeyframeInspectorProps {
  selectedKfInfo: { anim: Animation; kf: Keyframe } | null;
  availableProperties: AnimatableProperty[];
  onEasingChange: (animId: string, kfId: string, easing: EasingType) => void;
  onDeleteSelected: () => void;
  onAddTrack: (property: AnimatableProperty) => void;
}

export function KeyframeInspector({
  selectedKfInfo,
  availableProperties,
  onEasingChange,
  onDeleteSelected,
  onAddTrack,
}: KeyframeInspectorProps) {
  return (
    <div className="flex items-center gap-2">
      {selectedKfInfo && (
        <>
          <select
            value={selectedKfInfo.kf.easing}
            onChange={(e) => onEasingChange(selectedKfInfo.anim.id, selectedKfInfo.kf.id, e.target.value as EasingType)}
            className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-600 rounded px-1.5 py-0.5"
          >
            {EASING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={onDeleteSelected}
            className="p-0.5 text-neutral-500 hover:text-red-400"
            aria-label="Delete keyframe"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      )}
      {availableProperties.length > 0 && (
        <div className="relative group">
          <button className="p-0.5 text-neutral-500 hover:text-neutral-300" aria-label="Add property track">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-neutral-800 border border-neutral-600 rounded shadow-lg z-10">
            {availableProperties.map(p => (
              <button
                key={p}
                onClick={() => onAddTrack(p)}
                className="block w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 whitespace-nowrap"
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: PROPERTY_CONFIG[p].color }} />
                {PROPERTY_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
