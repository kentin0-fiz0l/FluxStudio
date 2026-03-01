import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';
import type { MaterialInfo } from '@/types/printing';

interface MaterialCardProps {
  material: MaterialInfo;
  selected: boolean;
  onClick: () => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material, selected, onClick }) => {
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
      aria-label={`${material.name} material - ${material.description}. Cost: $${material.costPerGram.toFixed(2)} per gram`}
      tabIndex={selected ? 0 : -1}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-2">
        <div className={cn('w-4 h-4 rounded-full mt-0.5', material.color)} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 text-sm mb-0.5">
            {material.name}
          </h3>
          <p className="text-xs text-neutral-600 mb-2">
            {material.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {material.properties.slice(0, 2).map((prop, idx) => (
              <Badge key={idx} variant="outline" size="sm" className="text-xs">
                {prop}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-500 mt-2">
        ${material.costPerGram.toFixed(2)}/gram
      </div>
    </button>
  );
};
