/**
 * Asset Helpers - FluxStudio
 *
 * Utility functions for asset detection and metadata extraction.
 * Centralizes logic for identifying specialized asset types like MetMap sessions.
 */

import { AssetRecord } from '../contexts/AssetsContext';

// ============================================================================
// MetMap Asset Detection
// ============================================================================

/**
 * MetMap asset metadata extracted from description and filename
 */
export interface MetMapAssetMetadata {
  title: string;
  bpm: number | null;
  sectionCount: number | null;
  totalBars: number | null;
  estimatedDurationSeconds: number | null;
}

/**
 * Check if an asset is a MetMap session based on filename and description patterns.
 * MetMap assets are saved with:
 * - filename ending in '_metmap.json'
 * - description starting with 'MetMap session:'
 * - role: 'metmap' (stored server-side)
 */
export function isMetMapAsset(asset: AssetRecord): boolean {
  // Check filename pattern (most reliable)
  const fileName = asset.fileName || asset.name || '';
  if (fileName.toLowerCase().endsWith('_metmap.json')) {
    return true;
  }

  // Check description pattern
  const description = asset.description || '';
  if (description.toLowerCase().startsWith('metmap session:')) {
    return true;
  }

  // Check mime type for JSON combined with metmap in name
  const mimeType = asset.mimeType || '';
  if (mimeType === 'application/json' && fileName.toLowerCase().includes('metmap')) {
    return true;
  }

  return false;
}

/**
 * Extract MetMap metadata from asset description.
 * Description format: "MetMap session: <title> - <N> sections, <M> bars, <BPM> BPM"
 */
export function extractMetMapMetadata(asset: AssetRecord): MetMapAssetMetadata {
  const description = asset.description || '';
  const fileName = asset.fileName || asset.name || '';

  // Default metadata
  const metadata: MetMapAssetMetadata = {
    title: extractTitleFromFilename(fileName),
    bpm: null,
    sectionCount: null,
    totalBars: null,
    estimatedDurationSeconds: null,
  };

  // Try to parse from description: "MetMap session: <title> - <N> sections, <M> bars, <BPM> BPM"
  const descMatch = description.match(/MetMap session:\s*(.+?)\s*-\s*(\d+)\s*sections?,\s*(\d+)\s*bars?,\s*(\d+)\s*BPM/i);
  if (descMatch) {
    metadata.title = descMatch[1].trim();
    metadata.sectionCount = parseInt(descMatch[2], 10);
    metadata.totalBars = parseInt(descMatch[3], 10);
    metadata.bpm = parseInt(descMatch[4], 10);

    // Estimate duration: bars * beatsPerBar * 60 / BPM (assume 4/4)
    if (metadata.bpm && metadata.totalBars) {
      metadata.estimatedDurationSeconds = Math.round((metadata.totalBars * 4 * 60) / metadata.bpm);
    }
  }

  return metadata;
}

/**
 * Extract a clean title from MetMap filename.
 * Filename format: "<title>_metmap.json"
 */
function extractTitleFromFilename(fileName: string): string {
  // Remove _metmap.json suffix
  let title = fileName.replace(/_metmap\.json$/i, '');

  // Replace underscores with spaces
  title = title.replace(/_/g, ' ');

  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Format duration in seconds to a human-readable string.
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '--';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build the URL to open a MetMap asset in the MetMap tool.
 */
export function buildMetMapOpenUrl(asset: AssetRecord, projectId?: string): string {
  const params = new URLSearchParams();

  if (projectId || asset.projectId) {
    params.set('projectId', projectId || asset.projectId || '');
  }

  params.set('assetId', asset.id);

  return `/tools/metmap?${params.toString()}`;
}
