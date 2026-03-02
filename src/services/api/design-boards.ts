/**
 * Design Boards API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function designBoardsApi(service: ApiService) {
  return {
    listBoards(projectId: string, params?: { includeArchived?: boolean }) {
      const qs = params?.includeArchived ? '?includeArchived=true' : '';
      return service.makeRequest(buildApiUrl(`/boards/projects/${encodeURIComponent(projectId)}/boards${qs}`));
    },

    createBoard(projectId: string, data: { name: string; description?: string; organizationId?: string }) {
      return service.makeRequest(buildApiUrl(`/boards/projects/${encodeURIComponent(projectId)}/boards`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getBoardStats(projectId: string) {
      return service.makeRequest(buildApiUrl(`/boards/projects/${encodeURIComponent(projectId)}/boards/stats`));
    },

    getBoard(boardId: string) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}`));
    },

    updateBoard(boardId: string, data: { name?: string; description?: string; isArchived?: boolean; thumbnailAssetId?: string }) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteBoard(boardId: string) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}`), {
        method: 'DELETE',
      });
    },

    createNode(boardId: string, data: { type: string; assetId?: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; rotation?: number; locked?: boolean; data?: Record<string, unknown> }) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/nodes`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getNodes(boardId: string) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/nodes`));
    },

    updateNode(boardId: string, nodeId: string, data: Record<string, unknown>) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/nodes/${encodeURIComponent(nodeId)}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteNode(boardId: string, nodeId: string) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/nodes/${encodeURIComponent(nodeId)}`), {
        method: 'DELETE',
      });
    },

    bulkUpdatePositions(boardId: string, updates: Array<{ nodeId: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; rotation?: number }>) {
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/nodes/bulk-position`), {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
    },

    getBoardEvents(boardId: string, params?: { limit?: number; offset?: number }) {
      const searchParams = new URLSearchParams();
      if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/boards/${encodeURIComponent(boardId)}/events${qs ? `?${qs}` : ''}`));
    },
  };
}
