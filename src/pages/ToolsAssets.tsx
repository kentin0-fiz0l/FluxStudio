/**
 * Assets Page - FluxStudio
 *
 * Reusable creative elements management tool.
 * Features:
 * - Browse and search assets
 * - Filter by kind (image, audio, video, document, etc.)
 * - Preview images, audio, and PDFs
 * - Version management
 * - Tags editing
 * - Project linking
 *
 * WCAG 2.1 Level A Compliant
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/templates/DashboardLayout';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

// Types
interface AssetVersion {
  id: string;
  assetId: string;
  fileId: string;
  versionNumber: number;
  label: string;
  width?: number;
  height?: number;
  durationMs?: number;
  format?: string;
  file?: {
    name: string;
    mimeType: string;
    size: number;
    fileUrl: string;
    thumbnailUrl?: string;
  };
  createdAt: string;
}

interface AssetProject {
  id: string;
  name: string;
  status: string;
  role: string;
  attachedAt: string;
}

interface Asset {
  id: string;
  organizationId?: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  kind: string;
  status: string;
  description?: string;
  tags: string[];
  primaryFileId: string;
  primaryFile?: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    fileUrl: string;
    thumbnailUrl?: string;
  };
  versions?: AssetVersion[];
  projects?: AssetProject[];
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface AssetStats {
  totalAssets: number;
  byKind: {
    image: number;
    video: number;
    audio: number;
    document: number;
    pdf: number;
    other: number;
  };
  byStatus: {
    active: number;
    archived: number;
  };
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getAssetIcon(kind: string): string {
  switch (kind) {
    case 'image': return '\u{1F5BC}\uFE0F';  // framed picture
    case 'audio': return '\u{1F3B5}';        // musical note
    case 'video': return '\u{1F3AC}';        // clapper board
    case 'pdf': return '\u{1F4C4}';          // page facing up
    case 'document': return '\u{1F4DD}';     // memo
    default: return '\u{1F4C1}';             // folder
  }
}

function getKindLabel(kind: string): string {
  switch (kind) {
    case 'image': return 'Image';
    case 'audio': return 'Audio';
    case 'video': return 'Video';
    case 'pdf': return 'PDF';
    case 'document': return 'Document';
    default: return 'Other';
  }
}

// Asset kind filter options
const ASSET_KINDS = [
  { value: 'all', label: 'All Assets' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'document', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

// Asset Card Component
function AssetCard({
  asset,
  isSelected,
  onClick
}: {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isImage = asset.kind === 'image';
  const thumbnailUrl = asset.primaryFile?.thumbnailUrl || asset.primaryFile?.fileUrl;

  return (
    <div
      className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-selected={isSelected}
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {isImage && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl">{getAssetIcon(asset.kind)}</span>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium text-sm text-gray-900 truncate" title={asset.name}>
          {asset.name}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {getKindLabel(asset.kind)}
          </span>
        </div>
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                {tag}
              </span>
            ))}
            {asset.tags.length > 2 && (
              <span className="text-xs text-gray-400">+{asset.tags.length - 2}</span>
            )}
          </div>
        )}
        {(asset.usageCount !== undefined && asset.usageCount > 0) && (
          <div className="text-xs text-gray-400 mt-1">
            Used in {asset.usageCount} project{asset.usageCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// Asset Detail Panel
function AssetDetailPanel({
  asset,
  onClose,
  onUpdate,
  onSetPrimary
}: {
  asset: Asset;
  onClose: () => void;
  onUpdate: (updates: Partial<Asset>) => void;
  onSetPrimary: (versionId: string) => void;
}) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState(asset.tags?.join(', ') || '');

  const isImage = asset.kind === 'image';
  const isAudio = asset.kind === 'audio';
  const isPdf = asset.kind === 'pdf';
  const fileUrl = asset.primaryFile?.fileUrl;

  const handleSaveTags = () => {
    const newTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    onUpdate({ tags: newTags });
    setEditingTags(false);
  };

  return (
    <div className="bg-white border-l border-gray-200 w-96 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-gray-900 truncate">{asset.name}</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        {isImage && fileUrl ? (
          <img src={fileUrl} alt={asset.name} className="w-full rounded-lg" />
        ) : isAudio && fileUrl ? (
          <audio controls className="w-full" src={fileUrl}>
            Your browser does not support audio playback.
          </audio>
        ) : isPdf && fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 bg-gray-100 rounded-lg text-center hover:bg-gray-200 transition-colors"
          >
            <span className="text-4xl">{getAssetIcon('pdf')}</span>
            <div className="text-sm text-gray-600 mt-2">Open PDF</div>
          </a>
        ) : (
          <div className="p-6 bg-gray-100 rounded-lg text-center">
            <span className="text-4xl">{getAssetIcon(asset.kind)}</span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Metadata */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Kind</dt>
              <dd className="text-gray-900">{getKindLabel(asset.kind)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className={`${asset.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">{formatDate(asset.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-900">{formatDate(asset.updatedAt)}</dd>
            </div>
            {asset.primaryFile && (
              <div className="flex justify-between">
                <dt className="text-gray-500">File size</dt>
                <dd className="text-gray-900">{formatFileSize(asset.primaryFile.size)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Tags */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Tags</h4>
            {!editingTags && (
              <button
                onClick={() => {
                  setTagsInput(asset.tags?.join(', ') || '');
                  setEditingTags(true);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Edit
              </button>
            )}
          </div>
          {editingTags ? (
            <div className="space-y-2">
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="design, logo, brand (comma-separated)"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTags}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTags(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : asset.tags && asset.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {asset.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No tags</p>
          )}
        </div>

        {/* Versions */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Versions</h4>
          {asset.versions && asset.versions.length > 0 ? (
            <ul className="space-y-2">
              {asset.versions.map((version) => {
                const isPrimary = version.fileId === asset.primaryFileId;
                return (
                  <li
                    key={version.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      isPrimary ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        v{version.versionNumber}
                        {isPrimary && (
                          <span className="ml-2 text-xs text-indigo-600">(Primary)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {version.label} - {formatDate(version.createdAt)}
                      </div>
                    </div>
                    {!isPrimary && (
                      <button
                        onClick={() => onSetPrimary(version.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        Set as primary
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No versions</p>
          )}
        </div>

        {/* Projects */}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Used in Projects</h4>
          {asset.projects && asset.projects.length > 0 ? (
            <ul className="space-y-2">
              {asset.projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">
                      {project.role} - {formatDate(project.attachedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Not used in any projects</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
        {fileUrl && (
          <a
            href={fileUrl}
            download={asset.name}
            className="block w-full px-4 py-2 text-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function ToolsAssets() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const pageSize = 20;

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      };
      if (searchQuery) params.search = searchQuery;
      if (kindFilter !== 'all') params.kind = kindFilter;

      const response = await apiService.get('/api/assets', { params });
      if (response.data.success) {
        setAssets(response.data.assets);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      showNotification({ type: 'error', title: 'Failed to load assets' });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, kindFilter, showNotification]);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.get('/api/assets/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading asset stats:', error);
    }
  }, []);

  const loadAssetDetail = useCallback(async (assetId: string) => {
    try {
      const response = await apiService.get(`/api/assets/${assetId}`);
      if (response.data.success) {
        setSelectedAsset(response.data.asset);
      }
    } catch (error) {
      console.error('Error loading asset detail:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    loadAssets();
    loadStats();
  }, [user, navigate, loadAssets, loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadAssets();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, kindFilter]);

  const handleAssetClick = (asset: Asset) => {
    loadAssetDetail(asset.id);
  };

  const handleUpdateAsset = async (updates: Partial<Asset>) => {
    if (!selectedAsset) return;

    try {
      const response = await apiService.patch(`/api/assets/${selectedAsset.id}`, updates);
      if (response.data.success) {
        showNotification({ type: 'success', title: 'Asset updated' });
        loadAssetDetail(selectedAsset.id);
        loadAssets();
      }
    } catch (error) {
      console.error('Error updating asset:', error);
      showNotification({ type: 'error', title: 'Failed to update asset' });
    }
  };

  const handleSetPrimary = async (versionId: string) => {
    if (!selectedAsset) return;

    try {
      const response = await apiService.post(`/api/assets/${selectedAsset.id}/primary`, { versionId });
      if (response.data.success) {
        showNotification({ type: 'success', title: 'Primary version updated' });
        loadAssetDetail(selectedAsset.id);
        loadAssets();
      }
    } catch (error) {
      console.error('Error setting primary version:', error);
      showNotification({ type: 'error', title: 'Failed to set primary version' });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const statsLine = stats ? [
    `${stats.totalAssets} assets`,
    stats.byKind.image > 0 && `${stats.byKind.image} images`,
    stats.byKind.audio > 0 && `${stats.byKind.audio} audio`,
    stats.byKind.video > 0 && `${stats.byKind.video} videos`,
    stats.byKind.document > 0 && `${stats.byKind.document} docs`,
    stats.byKind.pdf > 0 && `${stats.byKind.pdf} PDFs`,
  ].filter(Boolean).join(' \u00B7 ') : '';

  return (
    <DashboardLayout>
      <div className="h-full flex">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Assets</h1>
                {stats && (
                  <p className="text-sm text-gray-500 mt-1">{statsLine}</p>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ASSET_KINDS.map(kind => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Asset Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">{'\u{1F4E6}'}</div>
                <div className="text-gray-700 font-medium mb-1">No assets yet</div>
                <div className="text-sm text-gray-500">
                  {searchQuery || kindFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Convert Files into reusable Assets to get started.'}
                </div>
                {!searchQuery && kindFilter === 'all' && (
                  <button
                    onClick={() => navigate('/tools/files')}
                    className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700"
                  >
                    Go to Files
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {assets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAsset?.id === asset.id}
                      onClick={() => handleAssetClick(asset)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedAsset && (
          <AssetDetailPanel
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onUpdate={handleUpdateAsset}
            onSetPrimary={handleSetPrimary}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
