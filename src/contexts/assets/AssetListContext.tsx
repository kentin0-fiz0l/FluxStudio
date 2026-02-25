/* eslint-disable react-refresh/only-export-components */
/**
 * Asset List Context - FluxStudio
 *
 * Provides asset list operations: CRUD, filtering, and pagination.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
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
  const { state, dispatch } = useAssetCore();

  // Fetch assets with current filters
  const refreshAssets = React.useCallback(async (params?: Partial<AssetsFilter>) => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const filters = { ...state.filters, ...params };
      const { page, pageSize } = state.pagination;

      const queryParams: Record<string, string> = {};
      if (filters.search) queryParams.search = filters.search;
      if (filters.type && filters.type !== 'all') queryParams.type = filters.type;
      if (filters.status) queryParams.status = filters.status;
      if (filters.projectId) queryParams.projectId = filters.projectId;
      if (filters.tags && filters.tags.length > 0) queryParams.tags = filters.tags.join(',');
      queryParams.limit = String(pageSize);
      queryParams.offset = String((page - 1) * pageSize);

      const result = await apiService.get<{ assets: AssetRecord[]; total: number; totalPages: number }>('/assets', { params: queryParams });
      const data = result.data;

      dispatch({ type: 'SET_ASSETS', payload: data?.assets || [] });
      dispatch({
        type: 'SET_PAGINATION',
        payload: {
          total: data?.total || 0,
          totalPages: data?.totalPages || 0
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
  }, [user, state.filters, state.pagination, dispatch]);

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
      const result = await apiService.post<{ asset: AssetRecord }>('/assets', data);
      const asset = result.data?.asset;
      if (asset) dispatch({ type: 'ADD_ASSET', payload: asset });
      return asset ?? null;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }, [user, dispatch]);

  // Create asset from existing file
  const createAssetFromFile = React.useCallback(async (
    fileId: string,
    data?: { name?: string; description?: string; assetType?: AssetType }
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ asset: AssetRecord }>(`/assets/from-file/${fileId}`, data || {});
      const asset = result.data?.asset;
      if (asset) dispatch({ type: 'ADD_ASSET', payload: asset });
      return asset ?? null;
    } catch (error) {
      console.error('Error creating asset from file:', error);
      throw error;
    }
  }, [user, dispatch]);

  // Upload files directly to a project as assets
  const uploadAssetToProject = React.useCallback(async (
    projectId: string,
    files: File[],
    options?: { description?: string; tags?: string[]; role?: string }
  ): Promise<AssetRecord[]> => {
    if (!user) throw new Error('Authentication required');
    if (!files.length) throw new Error('At least one file is required');

    try {
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

      const result = await apiService.post<{ assets: AssetRecord[] }>(`/projects/${projectId}/assets`, formData);
      const assets = result.data?.assets || [];

      if (assets.length) {
        assets.forEach((asset: AssetRecord) => {
          dispatch({ type: 'ADD_ASSET', payload: asset });
        });
      }

      return assets;
    } catch (error) {
      console.error('Error uploading assets to project:', error);
      throw error;
    }
  }, [user, dispatch]);

  // Update asset
  const updateAsset = React.useCallback(async (
    assetId: string,
    updates: Partial<AssetRecord>
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.patch<{ asset: AssetRecord }>(`/assets/${assetId}`, updates);
      const asset = result.data?.asset;
      if (asset) dispatch({ type: 'UPDATE_ASSET', payload: asset });
      return asset ?? null;
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  }, [user, dispatch]);

  // Delete asset
  const deleteAsset = React.useCallback(async (assetId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      await apiService.delete(`/assets/${assetId}`);
      dispatch({ type: 'REMOVE_ASSET', payload: assetId });
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }, [user, dispatch]);

  // Get asset by ID
  const getAssetById = React.useCallback(async (
    assetId: string,
    options?: { includeVersions?: boolean; includeRelations?: boolean }
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const params: Record<string, string> = {};
      if (options?.includeVersions) params.includeVersions = 'true';
      if (options?.includeRelations) params.includeRelations = 'true';

      const result = await apiService.get<{ asset: AssetRecord }>(`/assets/${assetId}`, { params });
      return result.data?.asset ?? null;
    } catch (error) {
      // apiService throws on non-ok, but we want to return null on 404
      if (error instanceof Error && error.message.includes('404')) return null;
      console.error('Error getting asset:', error);
      throw error;
    }
  }, [user]);

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
