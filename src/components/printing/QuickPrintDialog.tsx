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
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Printer,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Rocket,
} from 'lucide-react';
import { config } from '@/config/environment';
import {
  type QuickPrintDialogProps,
  type QuickPrintConfig,
  type MaterialType,
  type QualityPreset,
} from '@/types/printing';

import { MATERIALS, QUALITY_PRESETS } from './quickprint/constants';
import { MaterialCard } from './quickprint/MaterialCard';
import { QualityCard } from './quickprint/QualityCard';
import { formatPrintTime, calculateEstimate } from './quickprint/printEstimates';

export const QuickPrintDialog: React.FC<QuickPrintDialogProps> = ({
  isOpen,
  onClose,
  filename,
  fileSize,
  onPrint,
  projectId: _projectId,
  estimate: providedEstimate,
  analysis,
}) => {
  // State
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

  // Handlers
  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      const printConfig: QuickPrintConfig = {
        material,
        quality,
        copies,
        supports,
        infill,
        notes,
      };

      await onPrint(printConfig);
      onClose();
    } catch (error) {
      console.error('Print error:', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary-600" aria-hidden="true" />
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
          {/* Coming Soon Banner when FLUXPRINT is disabled */}
          {!config.ENABLE_FLUXPRINT && (
            <Alert className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
              <Rocket className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <AlertDescription className="text-sm">
                <strong className="block mb-1">3D Printing Coming Soon!</strong>
                <span className="text-neutral-600">
                  We're preparing our 3D printing integration for launch. You'll soon be able to
                  print your designs directly from FluxStudio with one click.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Printability Warning (if issues) */}
          {analysis && analysis.score < 70 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
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
            <Label
              id="material-group-label"
              className="text-sm font-semibold text-neutral-900 mb-3 block"
            >
              Choose Material
            </Label>
            <div
              className="grid grid-cols-2 gap-3"
              role="radiogroup"
              aria-labelledby="material-group-label"
              onKeyDown={(e) => {
                const materials = MATERIALS.slice(0, 4);
                const currentIndex = materials.findIndex(m => m.id === material);

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const nextIndex = (currentIndex + 1) % materials.length;
                  setMaterial(materials[nextIndex].id);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prevIndex = (currentIndex - 1 + materials.length) % materials.length;
                  setMaterial(materials[prevIndex].id);
                }
              }}
            >
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
            <Label
              id="quality-group-label"
              className="text-sm font-semibold text-neutral-900 mb-3 block"
            >
              Print Quality
            </Label>
            <div
              className="grid grid-cols-2 gap-3"
              role="radiogroup"
              aria-labelledby="quality-group-label"
              onKeyDown={(e) => {
                const currentIndex = QUALITY_PRESETS.findIndex(p => p.id === quality);

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const nextIndex = (currentIndex + 1) % QUALITY_PRESETS.length;
                  handleQualityChange(QUALITY_PRESETS[nextIndex].id);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prevIndex = (currentIndex - 1 + QUALITY_PRESETS.length) % QUALITY_PRESETS.length;
                  handleQualityChange(QUALITY_PRESETS[prevIndex].id);
                }
              }}
            >
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
              <Clock className="h-4 w-4" aria-hidden="true" />
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
                  <CheckCircle2 className="h-3 w-3 text-green-600" aria-hidden="true" />
                  <span>High confidence estimate</span>
                </>
              )}
              {estimate.confidence === 'medium' && (
                <>
                  <AlertCircle className="h-3 w-3 text-yellow-600" aria-hidden="true" />
                  <span>Estimate may vary ±20%</span>
                </>
              )}
            </div>
          </div>

          {/* Advanced Options (Collapsed) */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 rounded-md px-2 py-1"
              aria-expanded={showAdvanced}
              aria-controls="advanced-options-panel"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
              Advanced Options
            </button>

            {showAdvanced && (
              <div
                id="advanced-options-panel"
                className="mt-4 space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                role="region"
                aria-label="Advanced printing options"
              >
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
            disabled={!config.ENABLE_FLUXPRINT || isPrinting || (analysis && !analysis.canPrint)}
            icon={<Printer className="h-4 w-4" aria-hidden="true" />}
            title={!config.ENABLE_FLUXPRINT ? "3D printing feature coming soon" : undefined}
          >
            {!config.ENABLE_FLUXPRINT
              ? 'Coming Soon'
              : isPrinting
                ? 'Starting Print...'
                : `Print ${copies > 1 ? `(${copies} copies)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPrintDialog;
