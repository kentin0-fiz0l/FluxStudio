/**
 * Asset Context Types - FluxStudio
 *
 * Shared type definitions for the Assets system.
 */

import * as React from 'react';

// ==================== Core Types ====================

export type AssetType = 'file' | 'design' | 'code' | 'document' | 'media' | 'other';
export type AssetStatus = 'active' | 'archived' | 'deleted';
export type RelationType = 'derived_from' | 'depends_on' | 'references' | 'variant_of' | 'composed_of';

export interface AssetRecord {
  id: string;
  name: string;
  description?: string;
  assetType: AssetType;
  currentVersion: number;
  currentFileId?: string;
  createdBy: string;
  creatorName?: string;
  creatorEmail?: string;
  projectId?: string;
  projectName?: string;
  organizationId?: string;
  organizationName?: string;
  status: AssetStatus;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
  versions?: AssetVersion[];
  relations?: AssetRelation[];
}

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  fileId: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  changeSummary?: string;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
}

export interface AssetRelation {
  id: string;
  sourceAssetId: string;
  sourceName?: string;
  targetAssetId: string;
  targetName?: string;
  relationType: RelationType;
  direction: 'incoming' | 'outgoing';
  description?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface AssetMetadata {
  id: string;
  assetId: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json' | 'date';
  category?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTag {
  id: string;
  assetId: string;
  tag: string;
  createdBy: string;
  createdAt: string;
}

export interface AssetComment {
  id: string;
  assetId: string;
  versionId?: string;
  content: string;
  parentCommentId?: string;
  createdBy: string;
  authorName?: string;
  authorEmail?: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== State Types ====================

export interface AssetsFilter {
  search: string;
  type: AssetType | 'all';
  projectId?: string;
  status: AssetStatus;
  tags?: string[];
}

export interface AssetsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssetsStats {
  totalAssets: number;
  projectsWithAssets: number;
  totalVersions: number;
  byType: Record<string, number>;
}

export interface AssetsState {
  assets: AssetRecord[];
  loading: boolean;
  error: string | null;
  filters: AssetsFilter;
  pagination: AssetsPagination;
  selectedAsset: AssetRecord | null;
  stats: AssetsStats | null;
  popularTags: { tag: string; count: number }[];
}

export type AssetsAction =
  | { type: 'SET_ASSETS'; payload: AssetRecord[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AssetsFilter> }
  | { type: 'SET_PAGINATION'; payload: Partial<AssetsPagination> }
  | { type: 'SET_SELECTED_ASSET'; payload: AssetRecord | null }
  | { type: 'SET_STATS'; payload: AssetsStats | null }
  | { type: 'SET_POPULAR_TAGS'; payload: { tag: string; count: number }[] }
  | { type: 'ADD_ASSET'; payload: AssetRecord }
  | { type: 'UPDATE_ASSET'; payload: AssetRecord }
  | { type: 'REMOVE_ASSET'; payload: string };

// ==================== Initial State ====================

export const initialAssetsState: AssetsState = {
  assets: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    type: 'all',
    status: 'active',
    projectId: undefined,
    tags: undefined
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  },
  selectedAsset: null,
  stats: null,
  popularTags: []
};

// ==================== Reducer ====================

export function assetsReducer(state: AssetsState, action: AssetsAction): AssetsState {
  switch (action.type) {
    case 'SET_ASSETS':
      return { ...state, assets: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 }
      };

    case 'SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };

    case 'SET_SELECTED_ASSET':
      return { ...state, selectedAsset: action.payload };

    case 'SET_STATS':
      return { ...state, stats: action.payload };

    case 'SET_POPULAR_TAGS':
      return { ...state, popularTags: action.payload };

    case 'ADD_ASSET':
      return { ...state, assets: [action.payload, ...state.assets] };

    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
        selectedAsset: state.selectedAsset?.id === action.payload.id
          ? action.payload
          : state.selectedAsset
      };

    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: state.assets.filter(a => a.id !== action.payload),
        selectedAsset: state.selectedAsset?.id === action.payload
          ? null
          : state.selectedAsset
      };

    default:
      return state;
  }
}

// ==================== Context Value Interfaces ====================

export interface AssetCoreContextValue {
  state: AssetsState;
  dispatch: React.Dispatch<AssetsAction>;
  getToken: () => string | null;
}

export interface AssetListContextValue {
  refreshAssets: (params?: Partial<AssetsFilter>) => Promise<void>;
  createAsset: (data: { name: string; description?: string; assetType?: AssetType; fileId?: string; projectId?: string }) => Promise<AssetRecord | null>;
  createAssetFromFile: (fileId: string, data?: { name?: string; description?: string; assetType?: AssetType }) => Promise<AssetRecord | null>;
  uploadAssetToProject: (projectId: string, files: File[], options?: { description?: string; tags?: string[]; role?: string }) => Promise<AssetRecord[]>;
  updateAsset: (assetId: string, updates: Partial<AssetRecord>) => Promise<AssetRecord | null>;
  deleteAsset: (assetId: string) => Promise<boolean>;
  getAssetById: (assetId: string, options?: { includeVersions?: boolean; includeRelations?: boolean }) => Promise<AssetRecord | null>;
  setFilters: (filters: Partial<AssetsFilter>) => void;
  setPage: (page: number) => void;
}

export interface AssetVersionContextValue {
  createVersion: (assetId: string, data: { fileId: string; changeSummary?: string }) => Promise<AssetVersion | null>;
  getVersions: (assetId: string) => Promise<AssetVersion[]>;
  revertToVersion: (assetId: string, versionNumber: number) => Promise<AssetRecord | null>;
}

export interface AssetRelationContextValue {
  createRelation: (assetId: string, data: { targetAssetId: string; relationType: RelationType; description?: string }) => Promise<AssetRelation | null>;
  getRelations: (assetId: string, options?: { direction?: 'incoming' | 'outgoing' | 'both'; relationType?: RelationType }) => Promise<AssetRelation[]>;
  deleteRelation: (relationId: string) => Promise<boolean>;
}

export interface AssetDetailContextValue {
  setSelectedAsset: (asset: AssetRecord | null) => void;
  setMetadata: (assetId: string, key: string, value: string, options?: { valueType?: string; category?: string }) => Promise<AssetMetadata | null>;
  getMetadata: (assetId: string, category?: string) => Promise<AssetMetadata[]>;
  deleteMetadata: (assetId: string, key: string) => Promise<boolean>;
  addTag: (assetId: string, tag: string) => Promise<AssetTag | null>;
  getTags: (assetId: string) => Promise<AssetTag[]>;
  removeTag: (assetId: string, tag: string) => Promise<boolean>;
  addComment: (assetId: string, data: { content: string; versionId?: string; parentCommentId?: string }) => Promise<AssetComment | null>;
  getComments: (assetId: string, versionId?: string) => Promise<AssetComment[]>;
  resolveComment: (commentId: string) => Promise<AssetComment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  fetchPopularTags: () => Promise<void>;
}
