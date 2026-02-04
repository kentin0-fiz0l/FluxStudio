/**
 * Assets Page - FluxStudio
 *
 * Comprehensive asset management dashboard with versioning, metadata,
 * lineage tracking, and project-aware UX.
 *
 * Features:
 * - Asset listing with grid/list views
 * - Filters by type, project, tags
 * - Version history and management
 * - Asset relations and lineage visualization
 * - Metadata and tags editing
 * - Comments and annotations
 * - Create assets from files
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/templates/DashboardLayout';
import { useAssets, AssetRecord, AssetType } from '../contexts/AssetsContext';
import { useFilesOptional } from '../contexts/FilesContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useProjectContextOptional } from '../contexts/ProjectContext';
import { AssetDetailDrawer } from '../components/assets/AssetDetailDrawer';
import { useReportEntityFocus } from '../hooks/useWorkMomentumCapture';

// Asset type icons and labels
const assetTypeConfig: Record<AssetType, { icon: string; label: string; color: string }> = {
  media: { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Media', color: 'bg-purple-100 text-purple-700' },
  document: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Document', color: 'bg-blue-100 text-blue-700' },
  design: { icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', label: 'Design', color: 'bg-pink-100 text-pink-700' },
  code: { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', label: 'Code', color: 'bg-green-100 text-green-700' },
  file: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'File', color: 'bg-gray-100 text-gray-700' },
  other: { icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label: 'Other', color: 'bg-orange-100 text-orange-700' }
};

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Asset card component
function AssetCard({
  asset,
  onClick,
  onCreateVersion,
  isGrid = true
}: {
  asset: AssetRecord;
  onClick: () => void;
  onCreateVersion?: () => void;
  isGrid?: boolean;
}) {
  const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;

  if (isGrid) {
    return (
      <div
        className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        aria-label={`Open asset ${asset.name}`}
      >
        {/* Thumbnail */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {asset.thumbnailUrl ? (
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeConfig.icon} />
              </svg>
            </div>
          )}
          {/* Version badge */}
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            v{asset.currentVersion}
          </div>
          {/* Type badge */}
          <div className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full ${typeConfig.color}`}>
            {typeConfig.label}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 truncate" title={asset.name}>
            {asset.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(asset.updatedAt)} {asset.fileSize && `| ${formatFileSize(asset.fileSize)}`}
          </p>
          {asset.projectName && (
            <p className="text-xs text-indigo-600 mt-1 truncate" title={asset.projectName}>
              {asset.projectName}
            </p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open asset ${asset.name}`}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeConfig.icon} />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate">{asset.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            v{asset.currentVersion}
          </span>
        </div>
        {asset.description && (
          <p className="text-sm text-gray-500 truncate mt-1">{asset.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Updated {formatDate(asset.updatedAt)}
          {asset.fileSize && ` | ${formatFileSize(asset.fileSize)}`}
          {asset.projectName && ` | ${asset.projectName}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onCreateVersion && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateVersion();
            }}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Upload new version"
            aria-label="Upload new version"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Stats card component
function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function Assets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    state: { assets, loading, error, filters, pagination, stats, popularTags },
    refreshAssets: _refreshAssets,
    fetchStats,
    fetchPopularTags,
    setFilters,
    setPage,
    setSelectedAsset,
    createAssetFromFile,
    deleteAsset,
    getAssetById
  } = useAssets();
  const filesContext = useFilesOptional();
  const filesState = filesContext?.state ?? { files: [], loading: false, error: null, filters: { search: '', type: 'all', source: 'all' }, pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, selectedFile: null, uploadProgress: {}, stats: null };
  const { addNotification } = useNotifications();
  const { reportAsset } = useReportEntityFocus();
  const projectContext = useProjectContextOptional();
  const currentProject = projectContext?.currentProject ?? null;

  // Local state
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchInput, setSearchInput] = React.useState(filters.search);
  const [showCreateFromFileModal, setShowCreateFromFileModal] = React.useState(false);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = React.useState(false);
  const [detailAsset, setDetailAsset] = React.useState<AssetRecord | null>(null);

  // Handle highlight parameter from URL (e.g., from messaging attachments)
  React.useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      // Fetch the asset and show in detail drawer
      (async () => {
        const asset = await getAssetById(highlightId);
        if (asset) {
          setDetailAsset(asset);
          setShowDetailDrawer(true);
        }
        // Clear the highlight param from URL
        searchParams.delete('highlight');
        setSearchParams(searchParams, { replace: true });
      })();
    }
  }, [searchParams, setSearchParams, getAssetById]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters]);

  // Apply project filter when current project changes
  React.useEffect(() => {
    if (currentProject) {
      setFilters({ projectId: currentProject.id });
    } else {
      setFilters({ projectId: undefined });
    }
  }, [currentProject, setFilters]);

  // Fetch stats and tags on mount
  React.useEffect(() => {
    fetchStats();
    fetchPopularTags();
  }, [fetchStats, fetchPopularTags]);

  // Handle create asset from file
  const handleCreateFromFile = async () => {
    if (!selectedFileId) return;

    setCreating(true);
    try {
      const asset = await createAssetFromFile(selectedFileId);
      if (asset) {
        addNotification({
          type: 'success',
          title: 'Asset Created',
          message: `Created asset "${asset.name}" successfully`
        });
        setShowCreateFromFileModal(false);
        setSelectedFileId(null);
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to create asset'
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle asset click - open detail drawer
  const handleAssetClick = (asset: AssetRecord) => {
    setDetailAsset(asset);
    setSelectedAsset(asset);
    setShowDetailDrawer(true);
    // Report to Work Momentum
    reportAsset(asset.id);
  };

  // Handle delete
  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      await deleteAsset(assetId);
      addNotification({
        type: 'success',
        title: 'Asset Deleted',
        message: 'Asset has been deleted successfully'
      });
      setShowDetailDrawer(false);
      setDetailAsset(null);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete asset'
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Assets"
            value={stats?.totalAssets || 0}
            icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
          <StatCard
            label="Total Versions"
            value={stats?.totalVersions || 0}
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <StatCard
            label="Projects with Assets"
            value={stats?.projectsWithAssets || 0}
            icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
          <StatCard
            label="Media Assets"
            value={stats?.byType?.media || 0}
            icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Search assets"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-3">
            {/* Type filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as AssetType | 'all' })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="media">Media</option>
              <option value="document">Documents</option>
              <option value="design">Design</option>
              <option value="code">Code</option>
              <option value="file">Files</option>
              <option value="other">Other</option>
            </select>

            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Create from file button */}
            <button
              onClick={() => setShowCreateFromFileModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Asset</span>
            </button>
          </div>
        </div>

        {/* Popular Tags */}
        {popularTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Popular tags:</span>
            {popularTags.slice(0, 10).map((t) => (
              <button
                key={t.tag}
                onClick={() => setFilters({ tags: [t.tag] })}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  filters.tags?.includes(t.tag)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                #{t.tag} ({t.count})
              </button>
            ))}
            {filters.tags && filters.tags.length > 0 && (
              <button
                onClick={() => setFilters({ tags: undefined })}
                className="text-xs text-indigo-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && assets.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No assets yet</h3>
            <p className="text-gray-500 mb-4">Create assets from your uploaded files to track versions and metadata.</p>
            <button
              onClick={() => setShowCreateFromFileModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Asset
            </button>
          </div>
        )}

        {/* Asset Grid/List */}
        {!loading && assets.length > 0 && (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
            : 'space-y-3'
          }>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onClick={() => handleAssetClick(asset)}
                isGrid={viewMode === 'grid'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create from File Modal */}
      {showCreateFromFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Asset from File</h2>
              <button
                onClick={() => {
                  setShowCreateFromFileModal(false);
                  setSelectedFileId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-96">
              {filesState.files.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No files available. Upload files first to create assets.</p>
                  <button
                    onClick={() => {
                      setShowCreateFromFileModal(false);
                      navigate('/file');
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Go to Files
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-3">Select a file to create an asset from:</p>
                  {filesState.files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        selectedFileId === file.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {file.thumbnailUrl ? (
                          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} | {formatDate(file.createdAt)}
                        </p>
                      </div>
                      {selectedFileId === file.id && (
                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateFromFileModal(false);
                  setSelectedFileId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFromFile}
                disabled={!selectedFileId || creating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Detail Drawer */}
      {showDetailDrawer && detailAsset && (
        <AssetDetailDrawer
          asset={detailAsset}
          onClose={() => {
            setShowDetailDrawer(false);
            setDetailAsset(null);
          }}
          onDelete={handleDelete}
        />
      )}
    </DashboardLayout>
  );
}
