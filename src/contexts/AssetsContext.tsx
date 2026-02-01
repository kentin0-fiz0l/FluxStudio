/**
 * Assets Context - FluxStudio
 *
 * REFACTORED: This file now re-exports from the modular assets/ directory.
 * The context has been split into focused modules for better maintainability:
 *
 * - assets/types.ts - Type definitions and reducer
 * - assets/AssetCoreContext.tsx - Shared state and dispatch
 * - assets/AssetListContext.tsx - CRUD, filtering, pagination
 * - assets/AssetVersionContext.tsx - Version management
 * - assets/AssetRelationContext.tsx - Relations/lineage
 * - assets/AssetDetailContext.tsx - Metadata, tags, comments
 * - assets/index.tsx - Combined provider and backwards-compatible hook
 *
 * For new code, import from './assets' and use specific hooks.
 * For existing code, this re-export maintains backwards compatibility.
 */

// Re-export everything for backwards compatibility
export {
  // Combined provider and hook
  AssetsProvider,
  useAssets,

  // Individual hooks for new code
  useAssetCore,
  useAssetList,
  useAssetVersions,
  useAssetRelations,
  useAssetDetail,

  // Types
  type AssetType,
  type AssetStatus,
  type RelationType,
  type AssetRecord,
  type AssetVersion,
  type AssetRelation,
  type AssetMetadata,
  type AssetTag,
  type AssetComment,
  type AssetsFilter,
  type AssetsPagination,
  type AssetsStats,
  type AssetsState,
  type AssetsAction,
  type AssetCoreContextValue,
  type AssetListContextValue,
  type AssetVersionContextValue,
  type AssetRelationContextValue,
  type AssetDetailContextValue,

  // Constants
  initialAssetsState,
  assetsReducer
} from './assets';

// Default export for backwards compatibility
export { default } from './assets';
