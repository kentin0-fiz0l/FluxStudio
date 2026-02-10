/**
 * TemplatePicker - UI for browsing and selecting drill formation templates
 *
 * Features:
 * - Browse templates by category (basic/intermediate/advanced)
 * - Search and filter
 * - Animated preview of template formations
 * - Apply template to current formation
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowLeft,
  Play,
  Pause,
  Users,
  Grid3X3,
  LayoutGrid,
  Loader2,
  Check,
} from 'lucide-react';
import { templateRegistry } from '@/services/formationTemplates/registry';
import {
  DrillTemplate,
  TemplateCategory,
  ApplyTemplateOptions,
  TemplatePosition,
} from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';

interface TemplatePickerProps {
  onApply: (options: Omit<ApplyTemplateOptions, 'formationId'>) => void;
  onCancel: () => void;
  performerCount: number;
  initialCategory?: TemplateCategory;
}

type ViewState = 'browse' | 'preview';

export function TemplatePicker({
  onApply,
  onCancel,
  performerCount,
  initialCategory,
}: TemplatePickerProps) {
  const [viewState, setViewState] = React.useState<ViewState>('browse');
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | null>(
    initialCategory || null
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [templates, setTemplates] = React.useState<DrillTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<DrillTemplate | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Preview options
  const [previewScale, setPreviewScale] = React.useState(1);
  const [previewRotation, setPreviewRotation] = React.useState(0);
  const [isPreviewAnimating, setIsPreviewAnimating] = React.useState(true);

  // Load templates
  React.useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchQuery]);

  const loadTemplates = () => {
    setIsLoading(true);
    try {
      let result: DrillTemplate[];

      if (searchQuery) {
        result = templateRegistry.searchTemplates({ search: searchQuery });
      } else if (selectedCategory) {
        result = templateRegistry.getByCategory(selectedCategory);
      } else {
        result = templateRegistry.getAllTemplates();
      }

      // Filter by performer count compatibility
      result = result.filter(t =>
        performerCount >= t.parameters.minPerformers &&
        (!t.parameters.maxPerformers || performerCount <= t.parameters.maxPerformers)
      );

      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: DrillTemplate) => {
    setSelectedTemplate(template);
    setPreviewScale(1);
    setPreviewRotation(0);
    setViewState('preview');
  };

  const handleApply = () => {
    if (!selectedTemplate) return;

    onApply({
      templateId: selectedTemplate.id,
      scale: previewScale,
      rotation: previewRotation,
      createMissingPerformers: performerCount < selectedTemplate.parameters.minPerformers,
    });
  };

  const categories = templateRegistry.getCategories();

  const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
    basic: <Grid3X3 className="w-4 h-4" />,
    intermediate: <LayoutGrid className="w-4 h-4" />,
    advanced: <Users className="w-4 h-4" />,
    custom: <Users className="w-4 h-4" />,
  };

  const categoryLabels: Record<TemplateCategory, string> = {
    basic: 'Basic',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    custom: 'Custom',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {viewState !== 'browse' && (
              <button
                onClick={() => setViewState('browse')}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <LayoutGrid className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {viewState === 'browse' && 'Formation Templates'}
              {viewState === 'preview' && selectedTemplate?.name}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {viewState === 'browse' && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      selectedCategory === null
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    All Templates
                  </button>
                  {categories.map(({ category: cat }) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        selectedCategory === cat
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {categoryIcons[cat]}
                      <span>{categoryLabels[cat]}</span>
                    </button>
                  ))}
                </div>

                {/* Performer count info */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>Showing templates for {performerCount} performers</span>
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No templates found for {performerCount} performers</p>
                    <p className="text-sm mt-1">Try adjusting your search or add more performers</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        performerCount={performerCount}
                        onClick={() => handleSelectTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {viewState === 'preview' && selectedTemplate && (
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
                        template={selectedTemplate}
                        performerCount={performerCount}
                        scale={previewScale}
                        rotation={previewRotation}
                        isAnimating={isPreviewAnimating}
                      />

                      {/* Animation controls */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setIsPreviewAnimating(!isPreviewAnimating)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full text-sm shadow-sm"
                        >
                          {isPreviewAnimating ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Play
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Template info */}
                    <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedTemplate.parameters.minPerformers}
                        {selectedTemplate.parameters.maxPerformers &&
                          `-${selectedTemplate.parameters.maxPerformers}`} performers
                      </span>
                      {selectedTemplate.parameters.scalable && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Check className="w-4 h-4" />
                          Scalable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {selectedTemplate.description}
                    </p>

                    <div className="space-y-4">
                      {/* Scale */}
                      {selectedTemplate.parameters.scalable && (
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
                            onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Rotation */}
                      {selectedTemplate.parameters.rotatable && (
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
                            onChange={(e) => setPreviewRotation(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Tags */}
                      {selectedTemplate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.tags.map((tag) => (
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
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {viewState === 'preview' && selectedTemplate && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setViewState('browse')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              <LayoutGrid className="w-4 h-4" />
              Apply Template
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface TemplateCardProps {
  template: DrillTemplate;
  performerCount: number;
  onClick: () => void;
}

function TemplateCard({ template, performerCount, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
    >
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 relative overflow-hidden">
        <TemplatePreviewCanvas
          template={template}
          performerCount={Math.min(performerCount, template.parameters.maxPerformers || performerCount)}
          scale={1}
          rotation={0}
          isAnimating={false}
          isMinimal
        />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        {template.name}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {template.description}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
          {template.category}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {template.parameters.minPerformers}+
        </span>
      </div>
    </button>
  );
}

interface TemplatePreviewCanvasProps {
  template: DrillTemplate;
  performerCount: number;
  scale: number;
  rotation: number;
  isAnimating: boolean;
  isMinimal?: boolean;
}

function TemplatePreviewCanvas({
  template,
  performerCount,
  scale,
  rotation,
  isAnimating,
  isMinimal = false,
}: TemplatePreviewCanvasProps) {
  const [animationFrame, setAnimationFrame] = React.useState(0);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Scale template for actual performer count
  const scaledPositions = React.useMemo((): TemplatePosition[] => {
    return templateRegistry.scaleTemplateForPerformers(template, performerCount);
  }, [template, performerCount]);

  // Animation loop
  React.useEffect(() => {
    if (!isAnimating || template.keyframes.length <= 1) return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % template.keyframes.length);
    }, 1500); // 1.5 seconds per keyframe

    return () => clearInterval(interval);
  }, [isAnimating, template.keyframes.length]);

  // Render canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw grid (only if not minimal)
    if (!isMinimal) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo((width / 4) * i, 0);
        ctx.lineTo((width / 4) * i, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
      }
    }

    // Get current positions (interpolate between keyframes if animating)
    let positions: TemplatePosition[] = scaledPositions;

    if (isAnimating && template.keyframes.length > 1) {
      const currentKeyframe = template.keyframes[animationFrame];
      positions = scaledPositions.map((pos: TemplatePosition, index: number) => {
        const keyframePos = currentKeyframe.positions.get(index);
        return keyframePos || pos;
      });
    }

    // Apply transformations and draw performers
    const rotationRad = (rotation * Math.PI) / 180;
    const performerSize = isMinimal ? 6 : 10;
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981',
    ];

    positions.forEach((pos: TemplatePosition, index: number) => {
      // Transform position
      let x = ((pos.x - 50) * scale) / 100 * (width * 0.8);
      let y = ((pos.y - 50) * scale) / 100 * (height * 0.8);

      // Apply rotation around center
      const rotatedX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
      const rotatedY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);

      const finalX = centerX + rotatedX;
      const finalY = centerY + rotatedY;

      // Draw performer dot
      ctx.beginPath();
      ctx.arc(finalX, finalY, performerSize, 0, Math.PI * 2);
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      // Draw label (only if not minimal)
      if (!isMinimal) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), finalX, finalY);
      }
    });
  }, [scaledPositions, scale, rotation, animationFrame, isAnimating, isMinimal, template.keyframes]);

  return (
    <canvas
      ref={canvasRef}
      width={isMinimal ? 200 : 400}
      height={isMinimal ? 200 : 400}
      className="w-full h-full"
    />
  );
}

export default TemplatePicker;
