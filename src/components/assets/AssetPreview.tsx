/**
 * AssetPreview - File/asset preview display and basic info
 * Extracted from AssetDetailDrawer
 */

import { AssetRecord } from '../../contexts/AssetsContext';

// Asset type config
export const assetTypeConfig: Record<string, { icon: string; label: string; color: string }> = {
  media: { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Media', color: 'bg-purple-100 text-purple-700' },
  document: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Document', color: 'bg-blue-100 text-blue-700' },
  design: { icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', label: 'Design', color: 'bg-pink-100 text-pink-700' },
  code: { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', label: 'Code', color: 'bg-green-100 text-green-700' },
  file: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'File', color: 'bg-gray-100 text-gray-700' },
  other: { icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label: 'Other', color: 'bg-orange-100 text-orange-700' }
};

export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface AssetPreviewProps {
  asset: AssetRecord;
  isEditing: boolean;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
}

export function AssetPreview({ asset, isEditing, editDescription, onEditDescriptionChange }: AssetPreviewProps) {
  const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;

  return (
    <>
      {/* Preview */}
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        {asset.thumbnailUrl || asset.fileUrl ? (
          <img
            src={asset.thumbnailUrl || asset.fileUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <svg className="w-20 h-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeConfig.icon} />
          </svg>
        )}
      </div>

      {/* Description */}
      {isEditing ? (
        <textarea
          value={editDescription}
          onChange={(e) => onEditDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          rows={3}
        />
      ) : asset.description ? (
        <p className="text-sm text-gray-600">{asset.description}</p>
      ) : null}
    </>
  );
}

export default AssetPreview;
