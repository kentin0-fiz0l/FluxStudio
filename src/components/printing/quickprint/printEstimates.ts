import type { MaterialType, QualityPreset, PrintEstimate } from '@/types/printing';
import { MATERIALS, QUALITY_PRESETS } from './constants';

/**
 * Format time in human-readable form
 */
export function formatPrintTime(hours: number, minutes: number): string {
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
export function calculateEstimate(
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
