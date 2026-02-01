/**
 * Asset Detail Context - FluxStudio
 *
 * Provides detail operations: selected asset, metadata, tags, comments, stats.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { getApiUrl } from '../../utils/apiHelpers';
import { useAssetCore } from './AssetCoreContext';
import type {
  AssetDetailContextValue,
  AssetRecord,
  AssetMetadata,
  AssetTag,
  AssetComment
} from './types';

const AssetDetailContext = React.createContext<AssetDetailContextValue | null>(null);

export function AssetDetailProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dispatch, getToken } = useAssetCore();

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
  }, [user, getToken, dispatch]);

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
  }, [user, getToken, dispatch]);

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
