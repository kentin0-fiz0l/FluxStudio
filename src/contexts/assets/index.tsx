/**
 * Assets Context Module - FluxStudio
 *
 * Modular asset management with focused contexts:
 * - AssetCoreContext: Shared state and reducer
 * - AssetListContext: CRUD, filtering, pagination
 * - AssetVersionContext: Version management
 * - AssetRelationContext: Relations/lineage
 * - AssetDetailContext: Metadata, tags, comments
 *
 * For backwards compatibility, AssetsProvider and useAssets()
 * combine all functionality into a single API.
 */

import * as React from 'react';

// Context providers
import { AssetCoreProvider, useAssetCore } from './AssetCoreContext';
import { AssetListProvider, useAssetList } from './AssetListContext';
import { AssetVersionProvider, useAssetVersions } from './AssetVersionContext';
import { AssetRelationProvider, useAssetRelations } from './AssetRelationContext';
import { AssetDetailProvider, useAssetDetail } from './AssetDetailContext';

// Re-export types
export * from './types';

// Re-export individual context hooks
export { useAssetCore } from './AssetCoreContext';
export { useAssetList } from './AssetListContext';
export { useAssetVersions } from './AssetVersionContext';
export { useAssetRelations } from './AssetRelationContext';
export { useAssetDetail } from './AssetDetailContext';

/**
 * Combined AssetsProvider that wraps all asset contexts.
 * Use this for full functionality or individual providers for specific needs.
 */
export function AssetsProvider({ children }: { children: React.ReactNode }) {
  return (
    <AssetCoreProvider>
      <AssetListProvider>
        <AssetVersionProvider>
          <AssetRelationProvider>
            <AssetDetailProvider>
              {children}
            </AssetDetailProvider>
          </AssetRelationProvider>
        </AssetVersionProvider>
      </AssetListProvider>
    </AssetCoreProvider>
  );
}

/**
 * Combined useAssets hook for backwards compatibility.
 * Returns all asset functionality from all contexts.
 *
 * For new code, prefer using specific hooks:
 * - useAssetCore() - state and dispatch
 * - useAssetList() - CRUD and filtering
 * - useAssetVersions() - version management
 * - useAssetRelations() - relations/lineage
 * - useAssetDetail() - metadata, tags, comments
 */
export function useAssets() {
  const { state, dispatch } = useAssetCore();
  const list = useAssetList();
  const versions = useAssetVersions();
  const relations = useAssetRelations();
  const detail = useAssetDetail();

  return {
    // State
    state,
    dispatch,

    // List operations
    refreshAssets: list.refreshAssets,
    createAsset: list.createAsset,
    createAssetFromFile: list.createAssetFromFile,
    uploadAssetToProject: list.uploadAssetToProject,
    updateAsset: list.updateAsset,
    deleteAsset: list.deleteAsset,
    getAssetById: list.getAssetById,
    setFilters: list.setFilters,
    setPage: list.setPage,

    // Version operations
    createVersion: versions.createVersion,
    getVersions: versions.getVersions,
    revertToVersion: versions.revertToVersion,

    // Relation operations
    createRelation: relations.createRelation,
    getRelations: relations.getRelations,
    deleteRelation: relations.deleteRelation,

    // Detail operations
    setSelectedAsset: detail.setSelectedAsset,
    setMetadata: detail.setMetadata,
    getMetadata: detail.getMetadata,
    deleteMetadata: detail.deleteMetadata,
    addTag: detail.addTag,
    getTags: detail.getTags,
    removeTag: detail.removeTag,
    addComment: detail.addComment,
    getComments: detail.getComments,
    resolveComment: detail.resolveComment,
    deleteComment: detail.deleteComment,
    fetchStats: detail.fetchStats,
    fetchPopularTags: detail.fetchPopularTags
  };
}

export default AssetsProvider;
