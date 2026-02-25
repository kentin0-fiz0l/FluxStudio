/* eslint-disable react-refresh/only-export-components */
/**
 * Asset Detail Context - FluxStudio
 *
 * Provides detail operations: selected asset, metadata, tags, comments, stats.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { useAssetCore } from './AssetCoreContext';
import type {
  AssetDetailContextValue,
  AssetRecord,
  AssetMetadata,
  AssetTag,
  AssetComment,
  AssetsStats
} from './types';

const AssetDetailContext = React.createContext<AssetDetailContextValue | null>(null);

export function AssetDetailProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dispatch } = useAssetCore();

  // Helper to set selected asset
  const setSelectedAsset = React.useCallback((asset: AssetRecord | null) => {
    dispatch({ type: 'SET_SELECTED_ASSET', payload: asset });
  }, [dispatch]);

  // Set metadata
  const setMetadata = React.useCallback(async (
    assetId: string,
    key: string,
    value: string,
    options?: { valueType?: string; category?: string }
  ): Promise<AssetMetadata | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ metadata: AssetMetadata }>(`/assets/${assetId}/metadata`, { key, value, ...options });
      return result.data?.metadata ?? null;
    } catch (error) {
      console.error('Error setting metadata:', error);
      throw error;
    }
  }, [user]);

  // Get metadata
  const getMetadata = React.useCallback(async (
    assetId: string,
    category?: string
  ): Promise<AssetMetadata[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      const result = await apiService.get<{ metadata: AssetMetadata[] }>(`/assets/${assetId}/metadata`, { params });
      return result.data?.metadata || [];
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error;
    }
  }, [user]);

  // Delete metadata
  const deleteMetadata = React.useCallback(async (assetId: string, key: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      await apiService.delete(`/assets/${assetId}/metadata/${encodeURIComponent(key)}`);
      return true;
    } catch (error) {
      console.error('Error deleting metadata:', error);
      throw error;
    }
  }, [user]);

  // Add tag
  const addTag = React.useCallback(async (assetId: string, tag: string): Promise<AssetTag | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ tag: AssetTag }>(`/assets/${assetId}/tags`, { tag });
      return result.data?.tag ?? null;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }, [user]);

  // Get tags
  const getTags = React.useCallback(async (assetId: string): Promise<AssetTag[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.get<{ tags: AssetTag[] }>(`/assets/${assetId}/tags`);
      return result.data?.tags || [];
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }, [user]);

  // Remove tag
  const removeTag = React.useCallback(async (assetId: string, tag: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      await apiService.delete(`/assets/${assetId}/tags/${encodeURIComponent(tag)}`);
      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }, [user]);

  // Add comment
  const addComment = React.useCallback(async (
    assetId: string,
    data: { content: string; versionId?: string; parentCommentId?: string }
  ): Promise<AssetComment | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ comment: AssetComment }>(`/assets/${assetId}/comments`, data);
      return result.data?.comment ?? null;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [user]);

  // Get comments
  const getComments = React.useCallback(async (
    assetId: string,
    versionId?: string
  ): Promise<AssetComment[]> => {
    if (!user) throw new Error('Authentication required');

    try {
      const params: Record<string, string> = {};
      if (versionId) params.versionId = versionId;
      const result = await apiService.get<{ comments: AssetComment[] }>(`/assets/${assetId}/comments`, { params });
      return result.data?.comments || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }, [user]);

  // Resolve comment
  const resolveComment = React.useCallback(async (commentId: string): Promise<AssetComment | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const result = await apiService.post<{ comment: AssetComment }>(`/assets/comments/${commentId}/resolve`);
      return result.data?.comment ?? null;
    } catch (error) {
      console.error('Error resolving comment:', error);
      throw error;
    }
  }, [user]);

  // Delete comment
  const deleteComment = React.useCallback(async (commentId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      await apiService.delete(`/assets/comments/${commentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }, [user]);

  // Fetch stats
  const fetchStats = React.useCallback(async () => {
    if (!user) return;

    try {
      const result = await apiService.get<{ stats: AssetsStats | null }>('/assets/stats');
      dispatch({ type: 'SET_STATS', payload: result.data?.stats ?? null });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user, dispatch]);

  // Fetch popular tags
  const fetchPopularTags = React.useCallback(async () => {
    if (!user) return;

    try {
      const result = await apiService.get<{ tags: { tag: string; count: number }[] }>('/assets/tags/popular');
      dispatch({ type: 'SET_POPULAR_TAGS', payload: result.data?.tags || [] });
    } catch (error) {
      console.error('Error fetching popular tags:', error);
    }
  }, [user, dispatch]);

  const value: AssetDetailContextValue = {
    setSelectedAsset,
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
    fetchPopularTags
  };

  return (
    <AssetDetailContext.Provider value={value}>
      {children}
    </AssetDetailContext.Provider>
  );
}

export function useAssetDetail(): AssetDetailContextValue {
  const context = React.useContext(AssetDetailContext);

  if (!context) {
    throw new Error('useAssetDetail must be used within an AssetDetailProvider');
  }

  return context;
}

export default AssetDetailContext;
