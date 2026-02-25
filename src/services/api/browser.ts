/**
 * Browser API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function browserApi(service: ApiService) {
  return {
    generateLinkPreview(url: string) {
      return service.makeRequest(buildApiUrl('/browser/link-preview'), {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
    },
    captureWebAsset(url: string, projectId: string, boardId?: string) {
      return service.makeRequest(buildApiUrl('/browser/web-capture'), {
        method: 'POST',
        body: JSON.stringify({ url, projectId, boardId }),
      });
    },
    exportPdf(html: string, projectId: string, options?: { css?: string; format?: string; pageSize?: string }) {
      return service.makeRequest(buildApiUrl('/browser/pdf-export'), {
        method: 'POST',
        body: JSON.stringify({ html, projectId, ...options }),
      });
    },
    generateThumbnail(projectId: string) {
      return service.makeRequest(buildApiUrl('/browser/thumbnail'), {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      });
    },
    runDesignQa(url: string, baselineAssetId: string, options?: { viewport?: { width: number; height: number }; threshold?: number }) {
      return service.makeRequest(buildApiUrl('/browser/design-qa'), {
        method: 'POST',
        body: JSON.stringify({ url, baselineAssetId, ...options }),
      });
    },
    getJobStatus(jobId: string) {
      return service.makeRequest(buildApiUrl(`/browser/jobs/${jobId}`));
    },
  };
}
