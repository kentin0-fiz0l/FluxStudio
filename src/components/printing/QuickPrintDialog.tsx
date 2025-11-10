/**
 * QuickPrintDialog Component
 * Phase 4A: Designer-First Foundation
 *
 * Designer-friendly print dialog that makes 3D printing feel like clicking "Publish"
 * Features:
 * - Visual material selector with cards
 * - Smart quality presets (no technical jargon)
 * - Time and cost estimates in human terms
 * - One-click print with intelligent defaults
 * - Progressive disclosure of advanced options
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Printer,
  Clock,
  DollarSign,
  Layers,
  Box,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  type QuickPrintDialogProps,
  type QuickPrintConfig,
  type MaterialType,
  type QualityPreset,
  type MaterialInfo,
  type QualityPresetInfo,
  type PrintEstimate,
} from '@/types/printing';
import { cn } from '@/lib/utils';

// ============================================================================
// Material Catalog (Designer-Friendly)
// ============================================================================

const MATERIALS: MaterialInfo[] = [
  {
    id: 'PLA',
    name: 'PLA',
    description: 'Standard plastic, easy to print',
    color: 'bg-blue-500',
    properties: ['Biodegradable', 'Rigid', 'Smooth finish'],
    costPerGram: 0.02,
    hotendTemp: 200,
    bedTemp: 60,
  },
  {
    id: 'PETG',
    name: 'PETG',
    description: 'Strong and flexible',
    color: 'bg-purple-500',
    properties: ['Durable', 'Heat-resistant', 'Flexible'],
    costPerGram: 0.025,
    hotendTemp: 230,
    bedTemp: 80,
  },
  {
    id: 'ABS',
    name: 'ABS',
    description: 'Engineering-grade, very strong',
    color: 'bg-orange-500',
    properties: ['Very strong', 'Heat-resistant', 'Post-processable'],
    costPerGram: 0.022,
    hotendTemp: 240,
    bedTemp: 100,
  },
  {
    id: 'TPU',
    name: 'TPU (Flexible)',
    description: 'Rubber-like, stretchy material',
    color: 'bg-green-500',
    properties: ['Flexible', 'Shock-absorbent', 'Wear-resistant'],
    costPerGram: 0.035,
    hotendTemp: 220,
    bedTemp: 50,
  },
  {
    id: 'NYLON',
    name: 'Nylon',
    description: 'High-strength, professional',
    color: 'bg-gray-500',
    properties: ['Very strong', 'Flexible', 'Wear-resistant'],
    costPerGram: 0.04,
    hotendTemp: 250,
    bedTemp: 90,
  },
];

// ============================================================================
// Quality Presets (Designer-Friendly)
// ============================================================================

const QUALITY_PRESETS: QualityPresetInfo[] = [
  {
    id: 'draft',
    name: 'Quick Draft',
    description: 'Fast prints for testing ideas',
    layerHeight: 0.3,
    infillPercentage: 10,
    speedMultiplier: 1.5,
    timeMultiplier: 0.6,
    recommended: false,
  },
  {
    id: 'standard',
    name: 'Standard Quality',
    description: 'Great for most uses',
    layerHeight: 0.2,
    infillPercentage: 20,
    speedMultiplier: 1.0,
    timeMultiplier: 1.0,
    recommended: true,
  },
  {
    id: 'high',
    name: 'High Detail',
    description: 'Smooth finish, fine features',
    layerHeight: 0.12,
    infillPercentage: 30,
    speedMultiplier: 0.8,
    timeMultiplier: 1.4,
    recommended: false,
  },
  {
    id: 'ultra',
    name: 'Exhibition Quality',
    description: 'Perfect for client presentations',
    layerHeight: 0.08,
    infillPercentage: 40,
    speedMultiplier: 0.6,
    timeMultiplier: 1.8,
    recommended: false,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time in human-readable form
 */
function formatPrintTime(hours: number, minutes: number): string {
  if (hours === 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}

/**
 * Calculate print estimate based on config
 */
function calculateEstimate(
  fileSize: number = 1000000,
  material: MaterialType,
  quality: QualityPreset,
  copies: number
): PrintEstimate {
  // Simplified estimation (in real app, this would call an API)
  const qualityInfo = QUALITY_PRESETS.find(q => q.id === quality)!;
  const materialInfo = MATERIALS.find(m => m.id === material)!;

  // Base time estimate (rough approximation)
  const baseMinutes = (fileSize / 50000) * qualityInfo.timeMultiplier;
  const totalMinutes = baseMinutes * copies;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Material estimate (rough approximation)
  const baseGrams = fileSize / 40000;
  const materialGrams = Math.round(baseGrams * (qualityInfo.infillPercentage / 20) * copies);
  const materialCost = materialGrams * materialInfo.costPerGram;

  return {
    timeHours: hours,
    timeMinutes: minutes,
    materialGrams,
    materialCost,
    totalCost: materialCost,
    confidence: fileSize > 500000 ? 'medium' : 'high',
  };
}

// ============================================================================
// Material Card Component
// ============================================================================

interface MaterialCardProps {
  material: MaterialInfo;
  selected: boolean;
  onClick: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-lg border-2 transition-all text-left',
        'hover:shadow-md hover:scale-[1.02]',
        selected
          ? 'border-primary-600 bg-primary-50 shadow-md'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      )}
      aria-pressed={selected}
      aria-label={`Select ${material.name} material`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-primary-600" />
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

// ============================================================================
// Quality Preset Card Component
// ============================================================================

interface QualityCardProps {
  preset: QualityPresetInfo;
  selected: boolean;
  onClick: () => void;
}

const QualityCard: React.FC<QualityCardProps> = ({ preset, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-lg border-2 transition-all text-left',
        'hover:shadow-md hover:scale-[1.02]',
        selected
          ? 'border-primary-600 bg-primary-50 shadow-md'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      )}
      aria-pressed={selected}
      aria-label={`Select ${preset.name} quality`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-primary-600" />
        </div>
      )}

      {preset.recommended && !selected && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" size="sm" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
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
          <Layers className="h-3 w-3" />
          {preset.layerHeight}mm
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {preset.speedMultiplier}x
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const QuickPrintDialog: React.FC<QuickPrintDialogProps> = ({
  isOpen,
  onClose,
  filename,
  fileSize,
  onPrint,
  projectId,
  estimate: providedEstimate,
  analysis,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [material, setMaterial] = useState<MaterialType>('PLA');
  const [quality, setQuality] = useState<QualityPreset>('standard');
  const [copies, setCopies] = useState<number>(1);
  const [supports, setSupports] = useState<boolean>(true);
  const [infill, setInfill] = useState<number>(20);
  const [notes, setNotes] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Calculate estimate
  const estimate = providedEstimate || calculateEstimate(fileSize || 1000000, material, quality, copies);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      const config: QuickPrintConfig = {
        material,
        quality,
        copies,
        supports,
        infill,
        notes,
      };

      await onPrint(config);
      onClose();
    } catch (error) {
      console.error('Print error:', error);
      // Error handling would show toast notification
    } finally {
      setIsPrinting(false);
    }
  };

  const handleQualityChange = (newQuality: QualityPreset) => {
    setQuality(newQuality);
    const preset = QUALITY_PRESETS.find(q => q.id === newQuality);
    if (preset) {
      setInfill(preset.infillPercentage);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMaterial('PLA');
      setQuality('standard');
      setCopies(1);
      setSupports(true);
      setInfill(20);
      setNotes('');
      setShowAdvanced(false);
      setIsPrinting(false);
    }
  }, [isOpen]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary-600" />
            Print This File
          </DialogTitle>
          <DialogDescription>
            {filename}
            {fileSize && (
              <span className="text-neutral-500 ml-2">
                ({(fileSize / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Printability Warning (if issues) */}
          {analysis && analysis.score < 70 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 text-sm mb-1">
                  Printability Score: {analysis.score}/100
                </h4>
                <p className="text-xs text-yellow-800 mb-2">
                  {analysis.warnings[0] || 'This file may have printing challenges'}
                </p>
                {analysis.suggestions.length > 0 && (
                  <p className="text-xs text-yellow-700">
                    💡 {analysis.suggestions[0]}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Material Selection */}
          <div>
            <Label className="text-sm font-semibold text-neutral-900 mb-3 block">
              Choose Material
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {MATERIALS.slice(0, 4).map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  selected={material === mat.id}
                  onClick={() => setMaterial(mat.id)}
                />
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          <div>
            <Label className="text-sm font-semibold text-neutral-900 mb-3 block">
              Print Quality
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {QUALITY_PRESETS.map((preset) => (
                <QualityCard
                  key={preset.id}
                  preset={preset}
                  selected={quality === preset.id}
                  onClick={() => handleQualityChange(preset.id)}
                />
              ))}
            </div>
          </div>

          {/* Print Estimate */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Print
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatPrintTime(estimate.timeHours, estimate.timeMinutes)}
                </div>
                <div className="text-xs text-neutral-600">Print time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900">
                  ${estimate.materialCost.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-600">Material cost</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900">
                  {estimate.materialGrams}g
                </div>
                <div className="text-xs text-neutral-600">{material}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1">
              {estimate.confidence === 'high' && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>High confidence estimate</span>
                </>
              )}
              {estimate.confidence === 'medium' && (
                <>
                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                  <span>Estimate may vary ±20%</span>
                </>
              )}
            </div>
          </div>

          {/* Advanced Options (Collapsed) */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                {/* Number of Copies */}
                <div>
                  <Label htmlFor="copies" className="text-sm font-medium text-neutral-700 mb-2 block">
                    Number of Copies
                  </Label>
                  <Input
                    id="copies"
                    type="number"
                    min={1}
                    max={10}
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className="max-w-xs"
                  />
                </div>

                {/* Support Structures */}
                <div className="flex items-center gap-3">
                  <input
                    id="supports"
                    type="checkbox"
                    checked={supports}
                    onChange={(e) => setSupports(e.target.checked)}
                    className="h-4 w-4 text-primary-600 rounded border-neutral-300"
                  />
                  <Label htmlFor="supports" className="text-sm font-medium text-neutral-700">
                    Auto-generate support structures
                  </Label>
                </div>

                {/* Infill Percentage */}
                <div>
                  <Label htmlFor="infill" className="text-sm font-medium text-neutral-700 mb-2 block">
                    Infill Density: {infill}%
                  </Label>
                  <Slider
                    id="infill"
                    min={10}
                    max={100}
                    step={5}
                    value={[infill]}
                    onValueChange={(values) => setInfill(values[0])}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Higher infill = stronger but slower and more expensive
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-neutral-700 mb-2 block">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this print..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPrinting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            disabled={isPrinting || (analysis && !analysis.canPrint)}
            icon={<Printer className="h-4 w-4" />}
          >
            {isPrinting ? 'Starting Print...' : `Print ${copies > 1 ? `(${copies} copies)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPrintDialog;
