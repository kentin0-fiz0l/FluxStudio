/**
 * AssetMetadataPanel - Metadata display, tags, and info panel
 * Extracted from AssetDetailDrawer
 */

import { AssetRecord, AssetMetadata, AssetTag } from '../../contexts/AssetsContext';
import { assetTypeConfig, formatFileSize, formatDate } from './AssetPreview';

interface AssetInfoProps {
  asset: AssetRecord;
}

export function AssetInfo({ asset }: AssetInfoProps) {
  const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;

  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500">Type</dt>
        <dd className={`px-2 py-0.5 rounded-full text-xs ${typeConfig.color}`}>
          {typeConfig.label}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Current Version</dt>
        <dd className="font-medium">v{asset.currentVersion}</dd>
      </div>
      {asset.fileSize && (
        <div className="flex justify-between">
          <dt className="text-gray-500">Size</dt>
          <dd>{formatFileSize(asset.fileSize)}</dd>
        </div>
      )}
      {asset.mimeType && (
        <div className="flex justify-between">
          <dt className="text-gray-500">MIME Type</dt>
          <dd className="text-gray-700">{asset.mimeType}</dd>
        </div>
      )}
      {asset.projectName && (
        <div className="flex justify-between">
          <dt className="text-gray-500">Project</dt>
          <dd className="text-indigo-600">{asset.projectName}</dd>
        </div>
      )}
      {asset.creatorName && (
        <div className="flex justify-between">
          <dt className="text-gray-500">Created By</dt>
          <dd>{asset.creatorName}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-gray-500">Created</dt>
        <dd>{formatDate(asset.createdAt)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Updated</dt>
        <dd>{formatDate(asset.updatedAt)}</dd>
      </div>
    </dl>
  );
}

interface TagsEditorProps {
  tags: AssetTag[];
  newTag: string;
  onNewTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

export function TagsEditor({ tags, newTag, onNewTagChange, onAddTag, onRemoveTag }: TagsEditorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
          >
            #{tag.tag}
            <button
              onClick={() => onRemoveTag(tag.tag)}
              className="hover:text-red-500"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
          placeholder="Add tag..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={onAddTag}
          disabled={!newTag.trim()}
          className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}

interface MetadataEditorProps {
  metadata: AssetMetadata[];
  newMetaKey: string;
  newMetaValue: string;
  onNewMetaKeyChange: (value: string) => void;
  onNewMetaValueChange: (value: string) => void;
  onAddMetadata: () => void;
  onDeleteMetadata: (key: string) => void;
}

export function MetadataEditor({
  metadata, newMetaKey, newMetaValue,
  onNewMetaKeyChange, onNewMetaValueChange,
  onAddMetadata, onDeleteMetadata
}: MetadataEditorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">Custom Metadata</h3>
      <div className="space-y-2 mb-3">
        {metadata.map((meta) => (
          <div
            key={meta.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div>
              <span className="text-sm font-medium">{meta.key}:</span>{' '}
              <span className="text-sm text-gray-600">{meta.value}</span>
            </div>
            <button
              onClick={() => onDeleteMetadata(meta.key)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newMetaKey}
          onChange={(e) => onNewMetaKeyChange(e.target.value)}
          placeholder="Key"
          className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={newMetaValue}
          onChange={(e) => onNewMetaValueChange(e.target.value)}
          placeholder="Value"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={onAddMetadata}
          disabled={!newMetaKey.trim()}
          className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default AssetInfo;
