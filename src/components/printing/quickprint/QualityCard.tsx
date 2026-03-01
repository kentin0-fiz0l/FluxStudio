import React from 'react';
import { CheckCircle2, Layers, Zap, Sparkles } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';
import type { QualityPresetInfo } from '@/types/printing';

interface QualityCardProps {
  preset: QualityPresetInfo;
  selected: boolean;
  onClick: () => void;
}

export const QualityCard: React.FC<QualityCardProps> = ({ preset, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-lg border-2 transition-all text-left',
        'hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
        selected
          ? 'border-primary-600 bg-primary-50 shadow-md'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      )}
      role="radio"
      aria-checked={selected}
      aria-label={`${preset.name} quality - ${preset.description}. Layer height: ${preset.layerHeight}mm`}
      tabIndex={selected ? 0 : -1}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </div>
      )}

      {preset.recommended && !selected && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" size="sm" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
            Recommended
          </Badge>
        </div>
      )}

      <h3 className="font-semibold text-neutral-900 text-sm mb-1 pr-8">
        {preset.name}
      </h3>
      <p className="text-xs text-neutral-600 mb-3">
        {preset.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1">
          <Layers className="h-3 w-3" aria-hidden="true" />
          {preset.layerHeight}mm
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" aria-hidden="true" />
          {preset.speedMultiplier}x
        </div>
      </div>
    </button>
  );
};
