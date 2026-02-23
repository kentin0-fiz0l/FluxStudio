/**
 * MetMapAssetCard Component
 *
 * Specialized card for displaying MetMap session assets.
 * Shows session title, BPM, section count, estimated duration,
 * and provides a direct "Open in MetMap" action.
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Music, Clock, Hash, Play } from 'lucide-react';
import { AssetRecord } from '../../contexts/AssetsContext';
import {
  extractMetMapMetadata,
  formatDuration,
  buildMetMapOpenUrl,
} from '../../utils/assetHelpers';
import { cn } from '../../lib/utils';

interface MetMapAssetCardProps {
  asset: AssetRecord;
  projectId?: string;
  className?: string;
  compact?: boolean;
  onOpenInMetMap?: (asset: AssetRecord) => void;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MetMapAssetCard({
  asset,
  projectId,
  className,
  compact = false,
  onOpenInMetMap,
}: MetMapAssetCardProps) {
  const metadata = React.useMemo(() => extractMetMapMetadata(asset), [asset]);
  const openUrl = buildMetMapOpenUrl(asset, projectId);

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenInMetMap) {
      e.preventDefault();
      onOpenInMetMap(asset);
    }
  };

  if (compact) {
    return (
      <Link
        to={openUrl}
        onClick={handleClick}
        className={cn(
          'block p-3 rounded-lg border border-gray-200',
          'hover:border-indigo-300 hover:bg-indigo-50/50',
          'transition-colors group',
          className
        )}
      >
        {/* MetMap Icon */}
        <div className="w-full aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 rounded-md mb-2 flex items-center justify-center relative">
          <Music className="w-8 h-8 text-indigo-400" aria-hidden="true" />
          {/* Play indicator on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/0 group-hover:bg-indigo-600/10 rounded-md transition-colors">
            <Play className="w-6 h-6 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-900 truncate mb-1">
          {metadata.title}
        </p>

        {/* Compact metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {metadata.bpm && (
            <span>{metadata.bpm} BPM</span>
          )}
          {metadata.sectionCount && (
            <>
              <span>·</span>
              <span>{metadata.sectionCount}s</span>
            </>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-200 bg-white',
        'hover:border-indigo-300 hover:shadow-sm',
        'transition-all',
        className
      )}
    >
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {metadata.title}
          </h4>
          <p className="text-xs text-gray-400">
            MetMap Session
          </p>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MetadataItem
          icon={<Play className="w-3.5 h-3.5" aria-hidden="true" />}
          label="BPM"
          value={metadata.bpm?.toString() || '--'}
        />
        <MetadataItem
          icon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
          label="Sections"
          value={metadata.sectionCount?.toString() || '--'}
        />
        <MetadataItem
          icon={<Music className="w-3.5 h-3.5" aria-hidden="true" />}
          label="Bars"
          value={metadata.totalBars?.toString() || '--'}
        />
        <MetadataItem
          icon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}
          label="Duration"
          value={formatDuration(metadata.estimatedDurationSeconds)}
        />
      </div>

      {/* Footer with timestamp and action */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {formatRelativeTime(asset.updatedAt || asset.createdAt)}
        </span>
        <Link
          to={openUrl}
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          Open in MetMap
        </Link>
      </div>
    </div>
  );
}

/**
 * Small metadata display item
 */
function MetadataItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}

export default MetMapAssetCard;
