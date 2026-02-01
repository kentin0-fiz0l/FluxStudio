/**
 * Asset Relation Context - FluxStudio
 *
 * Provides relation/lineage operations: create, list, delete.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { getApiUrl } from '../../utils/apiHelpers';
import { useAssetCore } from './AssetCoreContext';
import type { AssetRelationContextValue, AssetRelation, RelationType } from './types';

const AssetRelationContext = React.createContext<AssetRelationContextValue | null>(null);

export function AssetRelationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { getToken } = useAssetCore();

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

  const value: AssetRelationContextValue = {
    createRelation,
    getRelations,
    deleteRelation
  };

  return (
    <AssetRelationContext.Provider value={value}>
      {children}
    </AssetRelationContext.Provider>
  );
}

export function useAssetRelations(): AssetRelationContextValue {
  const context = React.useContext(AssetRelationContext);

  if (!context) {
    throw new Error('useAssetRelations must be used within an AssetRelationProvider');
  }

  return context;
}

export default AssetRelationContext;
