/**
 * Asset Detail Drawer - FluxStudio
 *
 * Comprehensive side drawer for viewing and managing asset details.
 * Includes versioning, relations, metadata, tags, and comments.
 *
 * WCAG 2.1 Level A Compliant
 *
 * Refactored: sub-components extracted to AssetPreview, AssetMetadataPanel, AssetActions
 */

import * as React from 'react';
import { useAssets, AssetRecord, AssetVersion, AssetRelation, AssetMetadata, AssetTag, AssetComment, RelationType } from '../../contexts/AssetsContext';
import { useFilesOptional } from '../../contexts/FilesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { createLogger } from '@/services/logging';

import { AssetPreview } from './AssetPreview';
import { AssetInfo, TagsEditor, MetadataEditor } from './AssetMetadataPanel';
import { AssetActionButtons, VersionList, CommentList, RelationList } from './AssetActions';

const assetLogger = createLogger('AssetDrawer');

interface AssetDetailDrawerProps {
  asset: AssetRecord;
  onClose: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}

type TabType = 'details' | 'versions' | 'relations' | 'metadata' | 'comments';

export function AssetDetailDrawer({ asset, onClose, onDelete }: AssetDetailDrawerProps) {
  const {
    getVersions, createVersion, revertToVersion,
    getRelations, createRelation, deleteRelation,
    getMetadata, setMetadata, deleteMetadata,
    getTags, addTag, removeTag,
    getComments, addComment, resolveComment,
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

  // New tag/metadata/comment/relation inputs
  const [newTag, setNewTag] = React.useState('');
  const [newMetaKey, setNewMetaKey] = React.useState('');
  const [newMetaValue, setNewMetaValue] = React.useState('');
  const [newComment, setNewComment] = React.useState('');
  const [showAddRelation, setShowAddRelation] = React.useState(false);
  const [newRelationTarget, setNewRelationTarget] = React.useState('');
  const [newRelationType, setNewRelationType] = React.useState<RelationType>('derived_from');

  // Load data when tab changes
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'versions': { const v = await getVersions(asset.id); setVersions(v); break; }
          case 'relations': { const r = await getRelations(asset.id); setRelations(r); break; }
          case 'metadata': {
            const [m, t] = await Promise.all([getMetadata(asset.id), getTags(asset.id)]);
            setMetadataState(m); setTagsState(t); break;
          }
          case 'comments': { const c = await getComments(asset.id); setCommentsState(c); break; }
        }
      } catch (_error) {
        assetLogger.error('Error loading data', _error as Error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, asset.id]);

  // Handlers
  const handleSaveEdit = async () => {
    try {
      await updateAsset(asset.id, { name: editName, description: editDescription });
      setIsEditing(false);
      addNotification({ type: 'success', title: 'Asset Updated', message: 'Asset details have been updated' });
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to update asset' });
    }
  };

  const handleVersionUpload = async () => {
    if (!selectedVersionFile) return;
    setUploadingVersion(true);
    try {
      const [uploadedFile] = await uploadFiles([selectedVersionFile]);
      const version = await createVersion(asset.id, { fileId: uploadedFile.id, changeSummary: versionChangeSummary || 'New version' });
      if (version) {
        setVersions(prev => [version, ...prev]);
        setShowVersionUpload(false); setSelectedVersionFile(null); setVersionChangeSummary('');
        addNotification({ type: 'success', title: 'Version Created', message: `Version ${version.versionNumber} has been created` });
      }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to create new version' });
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (!confirm(`Revert to version ${versionNumber}? This will create a new version.`)) return;
    try {
      await revertToVersion(asset.id, versionNumber);
      const v = await getVersions(asset.id); setVersions(v);
      addNotification({ type: 'success', title: 'Asset Reverted', message: `Reverted to version ${versionNumber}` });
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to revert' });
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      const tag = await addTag(asset.id, newTag.trim());
      if (tag) { setTagsState(prev => [...prev, tag]); setNewTag(''); }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to add tag' });
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTag(asset.id, tag);
      setTagsState(prev => prev.filter(t => t.tag !== tag));
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to remove tag' });
    }
  };

  const handleAddMetadata = async () => {
    if (!newMetaKey.trim()) return;
    try {
      const meta = await setMetadata(asset.id, newMetaKey.trim(), newMetaValue);
      if (meta) { setMetadataState(prev => [...prev.filter(m => m.key !== newMetaKey.trim()), meta]); setNewMetaKey(''); setNewMetaValue(''); }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to add metadata' });
    }
  };

  const handleDeleteMetadata = async (key: string) => {
    try {
      await deleteMetadata(asset.id, key);
      setMetadataState(prev => prev.filter(m => m.key !== key));
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete metadata' });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await addComment(asset.id, { content: newComment.trim() });
      if (comment) { setCommentsState(prev => [...prev, comment]); setNewComment(''); }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to add comment' });
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      const comment = await resolveComment(commentId);
      if (comment) { setCommentsState(prev => prev.map(c => c.id === commentId ? comment : c)); }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to resolve comment' });
    }
  };

  const handleAddRelation = async () => {
    if (!newRelationTarget) return;
    try {
      const relation = await createRelation(asset.id, { targetAssetId: newRelationTarget, relationType: newRelationType });
      if (relation) { setRelations(prev => [...prev, relation]); setShowAddRelation(false); setNewRelationTarget(''); }
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to create relation' });
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await deleteRelation(relationId);
      setRelations(prev => prev.filter(r => r.id !== relationId));
    } catch (_error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete relation' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Asset details">
      <div className="flex-1 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="w-full max-w-xl bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="p-4 flex items-center justify-between">
            {isEditing ? (
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 text-lg font-semibold border border-gray-300 rounded px-2 py-1 mr-2" autoFocus />
            ) : (
              <h2 className="text-lg font-semibold truncate">{asset.name}</h2>
            )}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSaveEdit} className="text-indigo-600 hover:text-indigo-700">Save</button>
                  <button onClick={() => { setIsEditing(false); setEditName(asset.name); setEditDescription(asset.description || ''); }} className="text-gray-500 hover:text-gray-700">Cancel</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex border-b border-gray-200 px-4">
            {(['details', 'versions', 'relations', 'metadata', 'comments'] as TabType[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
              {activeTab === 'details' && (
                <div className="p-4 space-y-6">
                  <AssetPreview asset={asset} isEditing={isEditing} editDescription={editDescription} onEditDescriptionChange={setEditDescription} />
                  <AssetInfo asset={asset} />
                  <AssetActionButtons asset={asset} onDelete={onDelete} />
                </div>
              )}

              {activeTab === 'versions' && (
                <VersionList
                  asset={asset} versions={versions}
                  showVersionUpload={showVersionUpload} uploadingVersion={uploadingVersion}
                  selectedVersionFile={selectedVersionFile} versionChangeSummary={versionChangeSummary}
                  onShowVersionUpload={setShowVersionUpload} onSelectVersionFile={setSelectedVersionFile}
                  onChangeSummary={setVersionChangeSummary} onVersionUpload={handleVersionUpload}
                  onRevert={handleRevert}
                />
              )}

              {activeTab === 'relations' && (
                <RelationList
                  relations={relations} showAddRelation={showAddRelation}
                  newRelationTarget={newRelationTarget} newRelationType={newRelationType}
                  onShowAddRelation={setShowAddRelation} onNewRelationTargetChange={setNewRelationTarget}
                  onNewRelationTypeChange={setNewRelationType} onAddRelation={handleAddRelation}
                  onDeleteRelation={handleDeleteRelation}
                />
              )}

              {activeTab === 'metadata' && (
                <div className="p-4 space-y-6">
                  <TagsEditor tags={tags} newTag={newTag} onNewTagChange={setNewTag} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />
                  <MetadataEditor metadata={metadata} newMetaKey={newMetaKey} newMetaValue={newMetaValue} onNewMetaKeyChange={setNewMetaKey} onNewMetaValueChange={setNewMetaValue} onAddMetadata={handleAddMetadata} onDeleteMetadata={handleDeleteMetadata} />
                </div>
              )}

              {activeTab === 'comments' && (
                <CommentList comments={comments} newComment={newComment} onNewCommentChange={setNewComment} onAddComment={handleAddComment} onResolveComment={handleResolveComment} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssetDetailDrawer;
