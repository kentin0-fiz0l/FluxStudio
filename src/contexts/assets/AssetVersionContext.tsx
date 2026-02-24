/* eslint-disable react-refresh/only-export-components */
/**
 * Asset Version Context - FluxStudio
 *
 * Provides version management operations: create, list, revert.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { getApiUrl } from '../../utils/apiHelpers';
import { useAssetCore } from './AssetCoreContext';
import { useAssetList } from './AssetListContext';
import type { AssetVersionContextValue, AssetVersion, AssetRecord } from './types';

const AssetVersionContext = React.createContext<AssetVersionContextValue | null>(null);

export function AssetVersionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dispatch, getToken } = useAssetCore();
  const { getAssetById } = useAssetList();

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
  }, [user, getToken, getAssetById, dispatch]);

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
  }, [user, getToken, dispatch]);

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
