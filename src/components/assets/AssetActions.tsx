/* eslint-disable react-refresh/only-export-components */
/**
 * AssetActions - Action buttons and comment/version/relation management
 * Extracted from AssetDetailDrawer
 */

import { AssetRecord, AssetVersion, AssetRelation, AssetComment, RelationType } from '../../contexts/AssetsContext';
import { formatDate } from './AssetPreview';
import { LazyImage } from '@/components/LazyImage';

// Relation type labels
export const relationTypeLabels: Record<RelationType, string> = {
  derived_from: 'Derived from',
  depends_on: 'Depends on',
  references: 'References',
  variant_of: 'Variant of',
  composed_of: 'Composed of'
};

interface AssetActionButtonsProps {
  asset: AssetRecord;
  onDelete?: (assetId: string) => Promise<void>;
}

export function AssetActionButtons({ asset, onDelete }: AssetActionButtonsProps) {
  return (
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
  );
}

interface VersionListProps {
  asset: AssetRecord;
  versions: AssetVersion[];
  showVersionUpload: boolean;
  uploadingVersion: boolean;
  selectedVersionFile: File | null;
  versionChangeSummary: string;
  onShowVersionUpload: (show: boolean) => void;
  onSelectVersionFile: (file: File | null) => void;
  onChangeSummary: (value: string) => void;
  onVersionUpload: () => void;
  onRevert: (versionNumber: number) => void;
}

export function VersionList({
  asset, versions, showVersionUpload, uploadingVersion,
  selectedVersionFile, versionChangeSummary,
  onShowVersionUpload, onSelectVersionFile, onChangeSummary,
  onVersionUpload, onRevert
}: VersionListProps) {
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => onShowVersionUpload(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="text-gray-600">Upload New Version</span>
      </button>

      {showVersionUpload && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <input
            type="file"
            onChange={(e) => onSelectVersionFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
          <textarea
            value={versionChangeSummary}
            onChange={(e) => onChangeSummary(e.target.value)}
            placeholder="What changed in this version?"
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={onVersionUpload}
              disabled={!selectedVersionFile || uploadingVersion}
              className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {uploadingVersion ? 'Uploading...' : 'Create Version'}
            </button>
            <button
              onClick={() => {
                onShowVersionUpload(false);
                onSelectVersionFile(null);
                onChangeSummary('');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {version.thumbnailUrl ? (
                <LazyImage src={version.thumbnailUrl} alt={`Version ${version.versionNumber}`} width={48} height={48} className="w-full h-full object-cover" />
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
                onClick={() => onRevert(version.versionNumber)}
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
  );
}

interface CommentListProps {
  comments: AssetComment[];
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  onResolveComment: (commentId: string) => void;
}

export function CommentList({ comments, newComment, onNewCommentChange, onAddComment, onResolveComment }: CommentListProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => onNewCommentChange(e.target.value)}
          placeholder="Add a comment..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
          rows={3}
        />
        <button
          onClick={onAddComment}
          disabled={!newComment.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          Post Comment
        </button>
      </div>

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
                  onClick={() => onResolveComment(comment.id)}
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
  );
}

interface RelationListProps {
  relations: AssetRelation[];
  showAddRelation: boolean;
  newRelationTarget: string;
  newRelationType: RelationType;
  onShowAddRelation: (show: boolean) => void;
  onNewRelationTargetChange: (value: string) => void;
  onNewRelationTypeChange: (value: RelationType) => void;
  onAddRelation: () => void;
  onDeleteRelation: (relationId: string) => void;
}

export function RelationList({
  relations, showAddRelation, newRelationTarget, newRelationType,
  onShowAddRelation, onNewRelationTargetChange, onNewRelationTypeChange,
  onAddRelation, onDeleteRelation
}: RelationListProps) {
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => onShowAddRelation(true)}
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
            onChange={(e) => onNewRelationTypeChange(e.target.value as RelationType)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          >
            {Object.entries(relationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            value={newRelationTarget}
            onChange={(e) => onNewRelationTargetChange(e.target.value)}
            placeholder="Target asset ID"
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={onAddRelation}
              disabled={!newRelationTarget}
              className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              Add Relation
            </button>
            <button
              onClick={() => {
                onShowAddRelation(false);
                onNewRelationTargetChange('');
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
              onClick={() => onDeleteRelation(relation.id)}
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
  );
}

export default AssetActionButtons;
