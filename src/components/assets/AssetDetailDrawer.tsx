/**
 * Asset Detail Drawer - FluxStudio
 *
 * Comprehensive side drawer for viewing and managing asset details.
 * Includes versioning, relations, metadata, tags, and comments.
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useAssets, AssetRecord, AssetVersion, AssetRelation, AssetMetadata, AssetTag, AssetComment, RelationType } from '../../contexts/AssetsContext';
import { useFilesOptional } from '../../contexts/FilesContext';
import { useNotifications } from '../../contexts/NotificationContext';

// Asset type config
const assetTypeConfig: Record<string, { icon: string; label: string; color: string }> = {
  media: { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Media', color: 'bg-purple-100 text-purple-700' },
  document: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Document', color: 'bg-blue-100 text-blue-700' },
  design: { icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', label: 'Design', color: 'bg-pink-100 text-pink-700' },
  code: { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', label: 'Code', color: 'bg-green-100 text-green-700' },
  file: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'File', color: 'bg-gray-100 text-gray-700' },
  other: { icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label: 'Other', color: 'bg-orange-100 text-orange-700' }
};

// Relation type labels
const relationTypeLabels: Record<RelationType, string> = {
  derived_from: 'Derived from',
  depends_on: 'Depends on',
  references: 'References',
  variant_of: 'Variant of',
  composed_of: 'Composed of'
};

// Helpers
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface AssetDetailDrawerProps {
  asset: AssetRecord;
  onClose: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}

type TabType = 'details' | 'versions' | 'relations' | 'metadata' | 'comments';

export function AssetDetailDrawer({ asset, onClose, onDelete }: AssetDetailDrawerProps) {
  const {
    getVersions,
    createVersion,
    revertToVersion,
    getRelations,
    createRelation,
    deleteRelation,
    getMetadata,
    setMetadata,
    deleteMetadata,
    getTags,
    addTag,
    removeTag,
    getComments,
    addComment,
    resolveComment,
    updateAsset
  } = useAssets();
  const filesContext = useFilesOptional();
  const uploadFiles = filesContext?.uploadFiles ?? (async () => []);
  const { addNotification } = useNotifications();

  // State
  const [activeTab, setActiveTab] = React.useState<TabType>('details');
  const [versions, setVersions] = React.useState<AssetVersion[]>([]);
  const [relations, setRelations] = React.useState<AssetRelation[]>([]);
  const [metadata, setMetadataState] = React.useState<AssetMetadata[]>([]);
  const [tags, setTagsState] = React.useState<AssetTag[]>([]);
  const [comments, setCommentsState] = React.useState<AssetComment[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Edit states
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(asset.name);
  const [editDescription, setEditDescription] = React.useState(asset.description || '');

  // New version upload
  const [showVersionUpload, setShowVersionUpload] = React.useState(false);
  const [versionChangeSummary, setVersionChangeSummary] = React.useState('');
  const [selectedVersionFile, setSelectedVersionFile] = React.useState<File | null>(null);
  const [uploadingVersion, setUploadingVersion] = React.useState(false);

  // New tag input
  const [newTag, setNewTag] = React.useState('');

  // New metadata input
  const [newMetaKey, setNewMetaKey] = React.useState('');
  const [newMetaValue, setNewMetaValue] = React.useState('');

  // New comment
  const [newComment, setNewComment] = React.useState('');

  // New relation
  const [showAddRelation, setShowAddRelation] = React.useState(false);
  const [newRelationTarget, setNewRelationTarget] = React.useState('');
  const [newRelationType, setNewRelationType] = React.useState<RelationType>('derived_from');

  // Load data when tab changes
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'versions':
            const v = await getVersions(asset.id);
            setVersions(v);
            break;
          case 'relations':
            const r = await getRelations(asset.id);
            setRelations(r);
            break;
          case 'metadata':
            const [m, t] = await Promise.all([
              getMetadata(asset.id),
              getTags(asset.id)
            ]);
            setMetadataState(m);
            setTagsState(t);
            break;
          case 'comments':
            const c = await getComments(asset.id);
            setCommentsState(c);
            break;
        }
      } catch (_error) {
        console.error('Error loading data:', _error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, asset.id]);

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      await updateAsset(asset.id, { name: editName, description: editDescription });
      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Asset Updated',
        message: 'Asset details have been updated'
      });
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update asset'
      });
    }
  };

  // Handle version upload
  const handleVersionUpload = async () => {
    if (!selectedVersionFile) return;

    setUploadingVersion(true);
    try {
      // First upload the file
      const [uploadedFile] = await uploadFiles([selectedVersionFile]);

      // Then create a version with that file
      const version = await createVersion(asset.id, {
        fileId: uploadedFile.id,
        changeSummary: versionChangeSummary || 'New version'
      });

      if (version) {
        setVersions(prev => [version, ...prev]);
        setShowVersionUpload(false);
        setSelectedVersionFile(null);
        setVersionChangeSummary('');
        addNotification({
          type: 'success',
          title: 'Version Created',
          message: `Version ${version.versionNumber} has been created`
        });
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create new version'
      });
    } finally {
      setUploadingVersion(false);
    }
  };

  // Handle revert
  const handleRevert = async (versionNumber: number) => {
    if (!confirm(`Revert to version ${versionNumber}? This will create a new version.`)) return;

    try {
      await revertToVersion(asset.id, versionNumber);
      const v = await getVersions(asset.id);
      setVersions(v);
      addNotification({
        type: 'success',
        title: 'Asset Reverted',
        message: `Reverted to version ${versionNumber}`
      });
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to revert'
      });
    }
  };

  // Handle add tag
  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      const tag = await addTag(asset.id, newTag.trim());
      if (tag) {
        setTagsState(prev => [...prev, tag]);
        setNewTag('');
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add tag'
      });
    }
  };

  // Handle remove tag
  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTag(asset.id, tag);
      setTagsState(prev => prev.filter(t => t.tag !== tag));
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove tag'
      });
    }
  };

  // Handle add metadata
  const handleAddMetadata = async () => {
    if (!newMetaKey.trim()) return;

    try {
      const meta = await setMetadata(asset.id, newMetaKey.trim(), newMetaValue);
      if (meta) {
        setMetadataState(prev => [...prev.filter(m => m.key !== newMetaKey.trim()), meta]);
        setNewMetaKey('');
        setNewMetaValue('');
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add metadata'
      });
    }
  };

  // Handle delete metadata
  const handleDeleteMetadata = async (key: string) => {
    try {
      await deleteMetadata(asset.id, key);
      setMetadataState(prev => prev.filter(m => m.key !== key));
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete metadata'
      });
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await addComment(asset.id, { content: newComment.trim() });
      if (comment) {
        setCommentsState(prev => [...prev, comment]);
        setNewComment('');
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add comment'
      });
    }
  };

  // Handle resolve comment
  const handleResolveComment = async (commentId: string) => {
    try {
      const comment = await resolveComment(commentId);
      if (comment) {
        setCommentsState(prev => prev.map(c => c.id === commentId ? comment : c));
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to resolve comment'
      });
    }
  };

  // Handle add relation
  const handleAddRelation = async () => {
    if (!newRelationTarget) return;

    try {
      const relation = await createRelation(asset.id, {
        targetAssetId: newRelationTarget,
        relationType: newRelationType
      });
      if (relation) {
        setRelations(prev => [...prev, relation]);
        setShowAddRelation(false);
        setNewRelationTarget('');
      }
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create relation'
      });
    }
  };

  // Handle delete relation
  const handleDeleteRelation = async (relationId: string) => {
    try {
      await deleteRelation(relationId);
      setRelations(prev => prev.filter(r => r.id !== relationId));
    } catch (_error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete relation'
      });
    }
  };

  const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Asset details">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="p-4 flex items-center justify-between">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 text-lg font-semibold border border-gray-300 rounded px-2 py-1 mr-2"
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-semibold truncate">{asset.name}</h2>
            )}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(asset.name);
                      setEditDescription(asset.description || '');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4">
            {(['details', 'versions', 'relations', 'metadata', 'comments'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="p-4 space-y-6">
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
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                      rows={3}
                    />
                  ) : asset.description ? (
                    <p className="text-sm text-gray-600">{asset.description}</p>
                  ) : null}

                  {/* Info */}
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

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {asset.fileUrl && (
                      <a
                        href={asset.fileUrl}
                        download
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(asset.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Versions Tab */}
              {activeTab === 'versions' && (
                <div className="p-4 space-y-4">
                  {/* Upload new version */}
                  <button
                    onClick={() => setShowVersionUpload(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-gray-600">Upload New Version</span>
                  </button>

                  {/* Version upload form */}
                  {showVersionUpload && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <input
                        type="file"
                        onChange={(e) => setSelectedVersionFile(e.target.files?.[0] || null)}
                        className="w-full text-sm"
                      />
                      <textarea
                        value={versionChangeSummary}
                        onChange={(e) => setVersionChangeSummary(e.target.value)}
                        placeholder="What changed in this version?"
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleVersionUpload}
                          disabled={!selectedVersionFile || uploadingVersion}
                          className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                        >
                          {uploadingVersion ? 'Uploading...' : 'Create Version'}
                        </button>
                        <button
                          onClick={() => {
                            setShowVersionUpload(false);
                            setSelectedVersionFile(null);
                            setVersionChangeSummary('');
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Version list */}
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          version.versionNumber === asset.currentVersion
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {version.thumbnailUrl ? (
                            <img src={version.thumbnailUrl} alt={`Version ${version.versionNumber}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              v{version.versionNumber}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Version {version.versionNumber}</span>
                            {version.versionNumber === asset.currentVersion && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Current</span>
                            )}
                          </div>
                          {version.changeSummary && (
                            <p className="text-sm text-gray-500 truncate">{version.changeSummary}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {version.creatorName || 'Unknown'} | {formatDate(version.createdAt)}
                          </p>
                        </div>

                        {version.versionNumber !== asset.currentVersion && (
                          <button
                            onClick={() => handleRevert(version.versionNumber)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Revert
                          </button>
                        )}
                      </div>
                    ))}

                    {versions.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No version history yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Relations Tab */}
              {activeTab === 'relations' && (
                <div className="p-4 space-y-4">
                  <button
                    onClick={() => setShowAddRelation(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-gray-600">Add Relation</span>
                  </button>

                  {showAddRelation && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <select
                        value={newRelationType}
                        onChange={(e) => setNewRelationType(e.target.value as RelationType)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                      >
                        {Object.entries(relationTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newRelationTarget}
                        onChange={(e) => setNewRelationTarget(e.target.value)}
                        placeholder="Target asset ID"
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddRelation}
                          disabled={!newRelationTarget}
                          className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                        >
                          Add Relation
                        </button>
                        <button
                          onClick={() => {
                            setShowAddRelation(false);
                            setNewRelationTarget('');
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {relations.map((relation) => (
                      <div
                        key={relation.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                      >
                        <div>
                          <p className="text-sm">
                            <span className="text-gray-500">{relationTypeLabels[relation.relationType]}</span>{' '}
                            <span className="font-medium">
                              {relation.direction === 'outgoing' ? relation.targetName : relation.sourceName}
                            </span>
                          </p>
                          {relation.description && (
                            <p className="text-xs text-gray-400">{relation.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteRelation(relation.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {relations.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No relations yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Tab */}
              {activeTab === 'metadata' && (
                <div className="p-4 space-y-6">
                  {/* Tags */}
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
                            onClick={() => handleRemoveTag(tag.tag)}
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
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add tag..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Custom Metadata */}
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
                            onClick={() => handleDeleteMetadata(meta.key)}
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
                        onChange={(e) => setNewMetaKey(e.target.value)}
                        placeholder="Key"
                        className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={newMetaValue}
                        onChange={(e) => setNewMetaValue(e.target.value)}
                        placeholder="Value"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleAddMetadata}
                        disabled={!newMetaKey.trim()}
                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="p-4 space-y-4">
                  {/* Comment input */}
                  <div className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                    >
                      Post Comment
                    </button>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${comment.isResolved ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm">{comment.authorName || 'Anonymous'}</span>
                            <span className="text-xs text-gray-400 ml-2">{formatDate(comment.createdAt)}</span>
                          </div>
                          {!comment.isResolved && (
                            <button
                              onClick={() => handleResolveComment(comment.id)}
                              className="text-xs text-green-600 hover:underline"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        {comment.isResolved && (
                          <p className="text-xs text-green-600 mt-2">Resolved</p>
                        )}
                      </div>
                    ))}

                    {comments.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No comments yet</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssetDetailDrawer;
