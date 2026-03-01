/**
 * Formations API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function formationsApi(service: ApiService) {
  return {
    getFormations(projectId: string, params?: { includeArchived?: boolean }) {
      const query = new URLSearchParams();
      if (params?.includeArchived) query.set('includeArchived', 'true');
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/formations/projects/${projectId}/formations${qs ? `?${qs}` : ''}`));
    },

    getFormation(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}`));
    },

    createFormation(projectId: string, data: {
      name: string;
      description?: string;
      stageWidth?: number;
      stageHeight?: number;
      gridSize?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/projects/${projectId}/formations`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateFormation(formationId: string, data: {
      name?: string;
      description?: string;
      stageWidth?: number;
      stageHeight?: number;
      gridSize?: number;
      isArchived?: boolean;
      audioTrack?: object | null;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteFormation(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}`), {
        method: 'DELETE',
      });
    },

    saveFormation(formationId: string, data: {
      name?: string;
      performers?: Array<object>;
      keyframes?: Array<object>;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/save`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    uploadAudio(formationId: string, data: {
      id?: string;
      url: string;
      filename: string;
      duration?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/audio`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    removeAudio(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/audio`), {
        method: 'DELETE',
      });
    },

    addPerformer(formationId: string, data: {
      name: string;
      label?: string;
      color?: string;
      groupName?: string;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updatePerformer(formationId: string, performerId: string, data: {
      name?: string;
      label?: string;
      color?: string;
      groupName?: string;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers/${performerId}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deletePerformer(formationId: string, performerId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers/${performerId}`), {
        method: 'DELETE',
      });
    },

    addKeyframe(formationId: string, data: {
      timestampMs?: number;
      transition?: string;
      duration?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateKeyframe(formationId: string, keyframeId: string, data: {
      timestampMs?: number;
      transition?: string;
      duration?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteKeyframe(formationId: string, keyframeId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}`), {
        method: 'DELETE',
      });
    },

    setPosition(formationId: string, keyframeId: string, performerId: string, data: {
      x: number;
      y: number;
      rotation?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}/positions/${performerId}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getSceneObjects(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects`));
    },

    createSceneObject(formationId: string, data: {
      id?: string;
      name: string;
      type: string;
      position?: object;
      source?: object;
      attachedToPerformerId?: string;
      visible?: boolean;
      locked?: boolean;
      layer?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateSceneObject(formationId: string, objectId: string, data: {
      name?: string;
      type?: string;
      position?: object;
      source?: object;
      attachedToPerformerId?: string;
      visible?: boolean;
      locked?: boolean;
      layer?: number;
    }) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects/${objectId}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteSceneObject(formationId: string, objectId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects/${objectId}`), {
        method: 'DELETE',
      });
    },

    bulkSyncSceneObjects(formationId: string, objects: Array<object>) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects`), {
        method: 'PUT',
        body: JSON.stringify({ objects }),
      });
    },

    getSharedFormation(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/share`));
    },

    generateShareLink(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/share`), {
        method: 'POST',
      });
    },
  };
}
