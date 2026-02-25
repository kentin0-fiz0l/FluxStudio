/* eslint-disable react-refresh/only-export-components */
/**
 * Asset Relation Context - FluxStudio
 *
 * Provides relation/lineage operations: create, list, delete.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { useAssetCore } from './AssetCoreContext';
import type { AssetRelationContextValue, AssetRelation, RelationType } from './types';

const AssetRelationContext = React.createContext<AssetRelationContextValue | null>(null);

export function AssetRelationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useAssetCore(); // ensure context is available

  // Create relation
  const createRelation = React.useCallback(async (
    assetId: string,
    data: { targetAssetId: string; relationType: RelationType; description?: string }
  ): Promise<AssetRelation | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ relation: AssetRelation }>(`/assets/${assetId}/relations`, data);
      return result.data?.relation ?? null;
    } catch (error) {
      console.error('Error creating relation:', error);
      throw error;
    }
  }, [user]);

  // Get relations
  const getRelations = React.useCallback(async (
    assetId: string,
    options?: { direction?: 'incoming' | 'outgoing' | 'both'; relationType?: RelationType }
  ): Promise<AssetRelation[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const params: Record<string, string> = {};
      if (options?.direction) params.direction = options.direction;
      if (options?.relationType) params.relationType = options.relationType;

      const result = await apiService.get<{ relations: AssetRelation[] }>(`/assets/${assetId}/relations`, { params });
      return result.data?.relations || [];
    } catch (error) {
      console.error('Error getting relations:', error);
      throw error;
    }
  }, [user]);

  // Delete relation
  const deleteRelation = React.useCallback(async (relationId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      await apiService.delete(`/assets/relations/${relationId}`);
      return true;
    } catch (error) {
      console.error('Error deleting relation:', error);
      throw error;
    }
  }, [user]);

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
