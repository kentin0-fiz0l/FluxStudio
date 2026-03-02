import { motion } from 'framer-motion';
import { Play, Pause, Users, Check } from 'lucide-react';
import { DrillTemplate } from '@/services/formationTemplates/types';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';

interface TemplatePreviewPanelProps {
  template: DrillTemplate;
  performerCount: number;
  previewScale: number;
  previewRotation: number;
  isPreviewAnimating: boolean;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onToggleAnimation: () => void;
}

export function TemplatePreviewPanel({
  template,
  performerCount,
  previewScale,
  previewRotation,
  isPreviewAnimating,
  onScaleChange,
  onRotationChange,
  onToggleAnimation,
}: TemplatePreviewPanelProps) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview Canvas */}
        <div>
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            <TemplatePreviewCanvas
              template={template}
              performerCount={performerCount}
              scale={previewScale}
              rotation={previewRotation}
              isAnimating={isPreviewAnimating}
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2">
              <button
                onClick={onToggleAnimation}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full text-sm shadow-sm"
              >
                {isPreviewAnimating ? (
                  <>
                    <Pause className="w-4 h-4" aria-hidden="true" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" aria-hidden="true" />
                    Play
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" aria-hidden="true" />
              {template.parameters.minPerformers}
              {template.parameters.maxPerformers &&
                `-${template.parameters.maxPerformers}`} performers
            </span>
            {template.parameters.scalable && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" aria-hidden="true" />
                Scalable
              </span>
            )}
          </div>
        </div>

        {/* Options */}
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {template.description}
          </p>
          <div className="space-y-4">
            {template.parameters.scalable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scale: {(previewScale * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={previewScale}
                  onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            {template.parameters.rotatable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rotation: {previewRotation}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={previewRotation}
                  onChange={(e) => onRotationChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
