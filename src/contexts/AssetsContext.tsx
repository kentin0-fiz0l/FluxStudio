/**
 * Assets Context - FluxStudio
 *
 * Global state management for the Assets system.
 * Provides versioning, metadata, lineage/relations, and project-aware UX.
 *
 * Features:
 * - Asset listing with filters, search, and pagination
 * - Version management and history
 * - Asset relations and lineage tracking
 * - Metadata and tags management
 * - Comments and annotations
 * - Integration with Files and Projects
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../utils/apiHelpers';

// ==================== Types ====================

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
  metadata?: Record<string, any>;
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

type AssetsAction =
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

export interface AssetsContextValue {
  state: AssetsState;
  dispatch: React.Dispatch<AssetsAction>;
  refreshAssets: (params?: Partial<AssetsFilter>) => Promise<void>;
  createAsset: (data: { name: string; description?: string; assetType?: AssetType; fileId?: string; projectId?: string }) => Promise<AssetRecord | null>;
  createAssetFromFile: (fileId: string, data?: { name?: string; description?: string; assetType?: AssetType }) => Promise<AssetRecord | null>;
  uploadAssetToProject: (projectId: string, files: File[], options?: { description?: string; tags?: string[]; role?: string }) => Promise<AssetRecord[]>;
  updateAsset: (assetId: string, updates: Partial<AssetRecord>) => Promise<AssetRecord | null>;
  deleteAsset: (assetId: string) => Promise<boolean>;
  getAssetById: (assetId: string, options?: { includeVersions?: boolean; includeRelations?: boolean }) => Promise<AssetRecord | null>;
  createVersion: (assetId: string, data: { fileId: string; changeSummary?: string }) => Promise<AssetVersion | null>;
  getVersions: (assetId: string) => Promise<AssetVersion[]>;
  revertToVersion: (assetId: string, versionNumber: number) => Promise<AssetRecord | null>;
  createRelation: (assetId: string, data: { targetAssetId: string; relationType: RelationType; description?: string }) => Promise<AssetRelation | null>;
  getRelations: (assetId: string, options?: { direction?: 'incoming' | 'outgoing' | 'both'; relationType?: RelationType }) => Promise<AssetRelation[]>;
  deleteRelation: (relationId: string) => Promise<boolean>;
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
  setSelectedAsset: (asset: AssetRecord | null) => void;
  setFilters: (filters: Partial<AssetsFilter>) => void;
  setPage: (page: number) => void;
}

// ==================== Initial State ====================

const initialState: AssetsState = {
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

function assetsReducer(state: AssetsState, action: AssetsAction): AssetsState {
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
        pagination: { ...state.pagination, page: 1 } // Reset page on filter change
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

// ==================== Context ====================

const AssetsContext = React.createContext<AssetsContextValue | null>(null);

export function AssetsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = React.useReducer(assetsReducer, initialState);

  // Get auth token
  const getToken = React.useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);

  // Fetch assets with current filters
  const refreshAssets = React.useCallback(async (params?: Partial<AssetsFilter>) => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const token = getToken();
      const filters = { ...state.filters, ...params };
      const { page, pageSize } = state.pagination;

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.type && filters.type !== 'all') queryParams.set('type', filters.type);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.projectId) queryParams.set('projectId', filters.projectId);
      if (filters.tags && filters.tags.length > 0) queryParams.set('tags', filters.tags.join(','));
      queryParams.set('limit', String(pageSize));
      queryParams.set('offset', String((page - 1) * pageSize));

      const response = await fetch(getApiUrl(`/assets?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();

      dispatch({ type: 'SET_ASSETS', payload: data.assets || [] });
      dispatch({
        type: 'SET_PAGINATION',
        payload: {
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }
      });

      if (params) {
        dispatch({ type: 'SET_FILTERS', payload: params });
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch assets'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, state.filters, state.pagination, getToken]);

  // Create asset
  const createAsset = React.useCallback(async (data: {
    name: string;
    description?: string;
    assetType?: AssetType;
    fileId?: string;
    projectId?: string;
  }): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/assets'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create asset');
      }

      const result = await response.json();
      dispatch({ type: 'ADD_ASSET', payload: result.asset });
      return result.asset;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }, [user, getToken]);

  // Create asset from existing file
  const createAssetFromFile = React.useCallback(async (
    fileId: string,
    data?: { name?: string; description?: string; assetType?: AssetType }
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/from-file/${fileId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data || {})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create asset from file');
      }

      const result = await response.json();
      dispatch({ type: 'ADD_ASSET', payload: result.asset });
      return result.asset;
    } catch (error) {
      console.error('Error creating asset from file:', error);
      throw error;
    }
  }, [user, getToken]);

  // Upload files directly to a project as assets
  const uploadAssetToProject = React.useCallback(async (
    projectId: string,
    files: File[],
    options?: { description?: string; tags?: string[]; role?: string }
  ): Promise<AssetRecord[]> => {
    if (!user) throw new Error('Authentication required');
    if (!files.length) throw new Error('At least one file is required');

    try {
      const token = getToken();
      const formData = new FormData();

      // Add files
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add options
      if (options?.description) {
        formData.append('description', options.description);
      }
      if (options?.tags?.length) {
        formData.append('tags', JSON.stringify(options.tags));
      }
      if (options?.role) {
        formData.append('role', options.role);
      }

      const response = await fetch(getApiUrl(`/projects/${projectId}/assets`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload assets');
      }

      const result = await response.json();

      // Add created assets to state
      if (result.assets?.length) {
        result.assets.forEach((asset: AssetRecord) => {
          dispatch({ type: 'ADD_ASSET', payload: asset });
        });
      }

      return result.assets || [];
    } catch (error) {
      console.error('Error uploading assets to project:', error);
      throw error;
    }
  }, [user, getToken]);

  // Update asset
  const updateAsset = React.useCallback(async (
    assetId: string,
    updates: Partial<AssetRecord>
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update asset');
      }

      const result = await response.json();
      dispatch({ type: 'UPDATE_ASSET', payload: result.asset });
      return result.asset;
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  }, [user, getToken]);

  // Delete asset
  const deleteAsset = React.useCallback(async (assetId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      dispatch({ type: 'REMOVE_ASSET', payload: assetId });
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }, [user, getToken]);

  // Get asset by ID
  const getAssetById = React.useCallback(async (
    assetId: string,
    options?: { includeVersions?: boolean; includeRelations?: boolean }
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const queryParams = new URLSearchParams();
      if (options?.includeVersions) queryParams.set('includeVersions', 'true');
      if (options?.includeRelations) queryParams.set('includeRelations', 'true');

      const response = await fetch(getApiUrl(`/assets/${assetId}?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json();
        throw new Error(error.error || 'Failed to get asset');
      }

      const result = await response.json();
      return result.asset;
    } catch (error) {
      console.error('Error getting asset:', error);
      throw error;
    }
  }, [user, getToken]);

  // Create version
  const createVersion = React.useCallback(async (
    assetId: string,
    data: { fileId: string; changeSummary?: string }
  ): Promise<AssetVersion | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/versions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create version');
      }

      const result = await response.json();

      // Refresh the asset to get updated version info
      const updatedAsset = await getAssetById(assetId, { includeVersions: true });
      if (updatedAsset) {
        dispatch({ type: 'UPDATE_ASSET', payload: updatedAsset });
      }

      return result.version;
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  }, [user, getToken, getAssetById]);

  // Get versions
  const getVersions = React.useCallback(async (assetId: string): Promise<AssetVersion[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/versions`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get versions');
      }

      const result = await response.json();
      return result.versions || [];
    } catch (error) {
      console.error('Error getting versions:', error);
      throw error;
    }
  }, [user, getToken]);

  // Revert to version
  const revertToVersion = React.useCallback(async (
    assetId: string,
    versionNumber: number
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/versions/${versionNumber}/revert`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert');
      }

      const result = await response.json();
      dispatch({ type: 'UPDATE_ASSET', payload: result.asset });
      return result.asset;
    } catch (error) {
      console.error('Error reverting to version:', error);
      throw error;
    }
  }, [user, getToken]);

  // Create relation
  const createRelation = React.useCallback(async (
    assetId: string,
    data: { targetAssetId: string; relationType: RelationType; description?: string }
  ): Promise<AssetRelation | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/relations`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create relation');
      }

      const result = await response.json();
      return result.relation;
    } catch (error) {
      console.error('Error creating relation:', error);
      throw error;
    }
  }, [user, getToken]);

  // Get relations
  const getRelations = React.useCallback(async (
    assetId: string,
    options?: { direction?: 'incoming' | 'outgoing' | 'both'; relationType?: RelationType }
  ): Promise<AssetRelation[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const queryParams = new URLSearchParams();
      if (options?.direction) queryParams.set('direction', options.direction);
      if (options?.relationType) queryParams.set('relationType', options.relationType);

      const response = await fetch(getApiUrl(`/assets/${assetId}/relations?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get relations');
      }

      const result = await response.json();
      return result.relations || [];
    } catch (error) {
      console.error('Error getting relations:', error);
      throw error;
    }
  }, [user, getToken]);

  // Delete relation
  const deleteRelation = React.useCallback(async (relationId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/relations/${relationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete relation');
      }

      return true;
    } catch (error) {
      console.error('Error deleting relation:', error);
      throw error;
    }
  }, [user, getToken]);

  // Set metadata
  const setMetadata = React.useCallback(async (
    assetId: string,
    key: string,
    value: string,
    options?: { valueType?: string; category?: string }
  ): Promise<AssetMetadata | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/metadata`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value, ...options })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set metadata');
      }

      const result = await response.json();
      return result.metadata;
    } catch (error) {
      console.error('Error setting metadata:', error);
      throw error;
    }
  }, [user, getToken]);

  // Get metadata
  const getMetadata = React.useCallback(async (
    assetId: string,
    category?: string
  ): Promise<AssetMetadata[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const queryParams = category ? `?category=${encodeURIComponent(category)}` : '';
      const response = await fetch(getApiUrl(`/assets/${assetId}/metadata${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get metadata');
      }

      const result = await response.json();
      return result.metadata || [];
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error;
    }
  }, [user, getToken]);

  // Delete metadata
  const deleteMetadata = React.useCallback(async (assetId: string, key: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/metadata/${encodeURIComponent(key)}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete metadata');
      }

      return true;
    } catch (error) {
      console.error('Error deleting metadata:', error);
      throw error;
    }
  }, [user, getToken]);

  // Add tag
  const addTag = React.useCallback(async (assetId: string, tag: string): Promise<AssetTag | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/tags`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add tag');
      }

      const result = await response.json();
      return result.tag;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }, [user, getToken]);

  // Get tags
  const getTags = React.useCallback(async (assetId: string): Promise<AssetTag[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/tags`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get tags');
      }

      const result = await response.json();
      return result.tags || [];
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }, [user, getToken]);

  // Remove tag
  const removeTag = React.useCallback(async (assetId: string, tag: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/tags/${encodeURIComponent(tag)}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove tag');
      }

      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }, [user, getToken]);

  // Add comment
  const addComment = React.useCallback(async (
    assetId: string,
    data: { content: string; versionId?: string; parentCommentId?: string }
  ): Promise<AssetComment | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/${assetId}/comments`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      const result = await response.json();
      return result.comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [user, getToken]);

  // Get comments
  const getComments = React.useCallback(async (
    assetId: string,
    versionId?: string
  ): Promise<AssetComment[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const queryParams = versionId ? `?versionId=${versionId}` : '';
      const response = await fetch(getApiUrl(`/assets/${assetId}/comments${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get comments');
      }

      const result = await response.json();
      return result.comments || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }, [user, getToken]);

  // Resolve comment
  const resolveComment = React.useCallback(async (commentId: string): Promise<AssetComment | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/comments/${commentId}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve comment');
      }

      const result = await response.json();
      return result.comment;
    } catch (error) {
      console.error('Error resolving comment:', error);
      throw error;
    }
  }, [user, getToken]);

  // Delete comment
  const deleteComment = React.useCallback(async (commentId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/assets/comments/${commentId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete comment');
      }

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }, [user, getToken]);

  // Fetch stats
  const fetchStats = React.useCallback(async () => {
    if (!user) return;

    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/assets/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      dispatch({ type: 'SET_STATS', payload: data.stats });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user, getToken]);

  // Fetch popular tags
  const fetchPopularTags = React.useCallback(async () => {
    if (!user) return;

    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/assets/tags/popular'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch popular tags');
      }

      const data = await response.json();
      dispatch({ type: 'SET_POPULAR_TAGS', payload: data.tags || [] });
    } catch (error) {
      console.error('Error fetching popular tags:', error);
    }
  }, [user, getToken]);

  // Helper to set selected asset
  const setSelectedAsset = React.useCallback((asset: AssetRecord | null) => {
    dispatch({ type: 'SET_SELECTED_ASSET', payload: asset });
  }, []);

  // Helper to set filters
  const setFilters = React.useCallback((filters: Partial<AssetsFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  // Helper to set page
  const setPage = React.useCallback((page: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { page } });
  }, []);

  // Fetch assets on mount and when filters/pagination change
  React.useEffect(() => {
    if (user) {
      refreshAssets();
    }
  }, [user, state.filters, state.pagination.page]);

  const value: AssetsContextValue = {
    state,
    dispatch,
    refreshAssets,
    createAsset,
    createAssetFromFile,
    uploadAssetToProject,
    updateAsset,
    deleteAsset,
    getAssetById,
    createVersion,
    getVersions,
    revertToVersion,
    createRelation,
    getRelations,
    deleteRelation,
    setMetadata,
    getMetadata,
    deleteMetadata,
    addTag,
    getTags,
    removeTag,
    addComment,
    getComments,
    resolveComment,
    deleteComment,
    fetchStats,
    fetchPopularTags,
    setSelectedAsset,
    setFilters,
    setPage
  };

  return (
    <AssetsContext.Provider value={value}>
      {children}
    </AssetsContext.Provider>
  );
}

// ==================== Hook ====================

export function useAssets(): AssetsContextValue {
  const context = React.useContext(AssetsContext);

  if (!context) {
    throw new Error('useAssets must be used within an AssetsProvider');
  }

  return context;
}

export default AssetsContext;
