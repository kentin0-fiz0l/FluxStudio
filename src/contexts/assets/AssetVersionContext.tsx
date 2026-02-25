/* eslint-disable react-refresh/only-export-components */
/**
 * Asset Version Context - FluxStudio
 *
 * Provides version management operations: create, list, revert.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { useAssetCore } from './AssetCoreContext';
import { useAssetList } from './AssetListContext';
import type { AssetVersionContextValue, AssetVersion, AssetRecord } from './types';

const AssetVersionContext = React.createContext<AssetVersionContextValue | null>(null);

export function AssetVersionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dispatch } = useAssetCore();
  const { getAssetById } = useAssetList();

  // Create version
  const createVersion = React.useCallback(async (
    assetId: string,
    data: { fileId: string; changeSummary?: string }
  ): Promise<AssetVersion | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ version: AssetVersion }>(`/assets/${assetId}/versions`, data);

      // Refresh the asset to get updated version info
      const updatedAsset = await getAssetById(assetId, { includeVersions: true });
      if (updatedAsset) {
        dispatch({ type: 'UPDATE_ASSET', payload: updatedAsset });
      }

      return result.data?.version ?? null;
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  }, [user, getAssetById, dispatch]);

  // Get versions
  const getVersions = React.useCallback(async (assetId: string): Promise<AssetVersion[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.get<{ versions: AssetVersion[] }>(`/assets/${assetId}/versions`);
      return result.data?.versions || [];
    } catch (error) {
      console.error('Error getting versions:', error);
      throw error;
    }
  }, [user]);

  // Revert to version
  const revertToVersion = React.useCallback(async (
    assetId: string,
    versionNumber: number
  ): Promise<AssetRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ asset: AssetRecord }>(`/assets/${assetId}/versions/${versionNumber}/revert`);
      const asset = result.data?.asset;
      if (asset) dispatch({ type: 'UPDATE_ASSET', payload: asset });
      return asset ?? null;
    } catch (error) {
      console.error('Error reverting to version:', error);
      throw error;
    }
  }, [user, dispatch]);

  const value: AssetVersionContextValue = {
    createVersion,
    getVersions,
    revertToVersion
  };

  return (
    <AssetVersionContext.Provider value={value}>
      {children}
    </AssetVersionContext.Provider>
  );
}

export function useAssetVersions(): AssetVersionContextValue {
  const context = React.useContext(AssetVersionContext);

  if (!context) {
    throw new Error('useAssetVersions must be used within an AssetVersionProvider');
  }

  return context;
}

export default AssetVersionContext;
