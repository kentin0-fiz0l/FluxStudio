/**
 * Formations API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  createFormationSchema,
  updateFormationSchema,
  saveFormationSchema,
  uploadAudioSchema,
  addPerformerSchema,
  updatePerformerSchema,
  keyframeSchema,
  setPositionSchema,
  createSceneObjectSchema,
  updateSceneObjectSchema,
  type CreateFormationInput,
  type UpdateFormationInput,
  type SaveFormationInput,
  type UploadAudioInput,
  type AddPerformerInput,
  type UpdatePerformerInput,
  type KeyframeInput,
  type SetPositionInput,
  type CreateSceneObjectInput,
  type UpdateSceneObjectInput,
} from '../apiValidation';

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

    createFormation(projectId: string, data: CreateFormationInput) {
      const validated = validate(createFormationSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/projects/${projectId}/formations`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateFormation(formationId: string, data: UpdateFormationInput) {
      const validated = validate(updateFormationSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}`), {
        method: 'PATCH',
        body: JSON.stringify(validated),
      });
    },

    deleteFormation(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}`), {
        method: 'DELETE',
      });
    },

    saveFormation(formationId: string, data: SaveFormationInput) {
      const validated = validate(saveFormationSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/save`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    uploadAudio(formationId: string, data: UploadAudioInput) {
      const validated = validate(uploadAudioSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/audio`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    removeAudio(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/audio`), {
        method: 'DELETE',
      });
    },

    addPerformer(formationId: string, data: AddPerformerInput) {
      const validated = validate(addPerformerSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updatePerformer(formationId: string, performerId: string, data: UpdatePerformerInput) {
      const validated = validate(updatePerformerSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers/${performerId}`), {
        method: 'PATCH',
        body: JSON.stringify(validated),
      });
    },

    deletePerformer(formationId: string, performerId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/performers/${performerId}`), {
        method: 'DELETE',
      });
    },

    addKeyframe(formationId: string, data: KeyframeInput) {
      const validated = validate(keyframeSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateKeyframe(formationId: string, keyframeId: string, data: KeyframeInput) {
      const validated = validate(keyframeSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}`), {
        method: 'PATCH',
        body: JSON.stringify(validated),
      });
    },

    deleteKeyframe(formationId: string, keyframeId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}`), {
        method: 'DELETE',
      });
    },

    setPosition(formationId: string, keyframeId: string, performerId: string, data: SetPositionInput) {
      const validated = validate(setPositionSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/keyframes/${keyframeId}/positions/${performerId}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    getSceneObjects(formationId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects`));
    },

    createSceneObject(formationId: string, data: CreateSceneObjectInput) {
      const validated = validate(createSceneObjectSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateSceneObject(formationId: string, objectId: string, data: UpdateSceneObjectInput) {
      const validated = validate(updateSceneObjectSchema, data);
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects/${objectId}`), {
        method: 'PATCH',
        body: JSON.stringify(validated),
      });
    },

    deleteSceneObject(formationId: string, objectId: string) {
      return service.makeRequest(buildApiUrl(`/formations/formations/${formationId}/scene-objects/${objectId}`), {
        method: 'DELETE',
      });
    },

    bulkSyncSceneObjects(formationId: string, objects: Array<Record<string, unknown>>) {
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
