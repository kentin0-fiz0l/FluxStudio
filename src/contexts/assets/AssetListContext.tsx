/* eslint-disable react-refresh/only-export-components */
/**
 * Asset List Context - FluxStudio
 *
 * Provides asset list operations: CRUD, filtering, and pagination.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { getApiUrl } from '../../utils/apiHelpers';
import { useAssetCore } from './AssetCoreContext';
import type {
  AssetListContextValue,
  AssetRecord,
  AssetType,
  AssetsFilter
} from './types';

const AssetListContext = React.createContext<AssetListContextValue | null>(null);

export function AssetListProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { state, dispatch, getToken } = useAssetCore();

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
  }, [user, state.filters, state.pagination, getToken, dispatch]);

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
  }, [user, getToken, dispatch]);

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
  }, [user, getToken, dispatch]);

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

      files.forEach(file => {
        formData.append('files', file);
      });

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
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload assets');
      }

      const result = await response.json();

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
  }, [user, getToken, dispatch]);

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
  }, [user, getToken, dispatch]);

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
  }, [user, getToken, dispatch]);

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

  // Helper to set filters
  const setFilters = React.useCallback((filters: Partial<AssetsFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, [dispatch]);

  // Helper to set page
  const setPage = React.useCallback((page: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { page } });
  }, [dispatch]);

  // Fetch assets on mount and when filters/pagination change
  React.useEffect(() => {
    if (user) {
      refreshAssets();
    }
  }, [user, state.filters, state.pagination.page, refreshAssets]);

  const value: AssetListContextValue = {
    refreshAssets,
    createAsset,
    createAssetFromFile,
    uploadAssetToProject,
    updateAsset,
    deleteAsset,
    getAssetById,
    setFilters,
    setPage
  };

  return (
    <AssetListContext.Provider value={value}>
      {children}
    </AssetListContext.Provider>
  );
}

export function useAssetList(): AssetListContextValue {
  const context = React.useContext(AssetListContext);

  if (!context) {
    throw new Error('useAssetList must be used within an AssetListProvider');
  }

  return context;
}

export default AssetListContext;
