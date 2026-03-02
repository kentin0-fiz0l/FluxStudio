/**
 * Media API endpoints — Transcoding and HLS Streaming
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function mediaApi(service: ApiService) {
  return {
    submitTranscode(data: { fileId: string }) {
      return service.makeRequest(buildApiUrl('/media/transcode'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getTranscodeStatus(fileId: string) {
      return service.makeRequest(buildApiUrl(`/media/transcode/${fileId}`));
    },

    monitorJobs() {
      return service.makeRequest(buildApiUrl('/media/monitor-jobs'), {
        method: 'POST',
      });
    },

    getManifest(fileId: string) {
      return service.makeRequest(buildApiUrl(`/media/${fileId}/manifest`));
    },
  };
}
