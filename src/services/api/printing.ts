/**
 * Printing API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  quickPrintSchema,
  QuickPrintInput,
  printFileLinkSchema,
  PrintFileLinkInput,
  printJobLinkSchema,
  PrintJobLinkInput,
  printJobStatusUpdateSchema,
  PrintJobStatusUpdateInput,
  printEstimateSchema,
  PrintEstimateInput,
} from '../apiValidation';

export function printingApi(service: ApiService) {
  return {
    quickPrint(input: QuickPrintInput) {
      const validated = validate(quickPrintSchema, input);
      return service.makeRequest(buildApiUrl('/printing/quick-print'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    getStatus() {
      return service.makeRequest(buildApiUrl('/printing/status'));
    },

    getCurrentJob() {
      return service.makeRequest(buildApiUrl('/printing/job'));
    },

    getTemperature() {
      return service.makeRequest(buildApiUrl('/printing/temperature'));
    },

    getQueue() {
      return service.makeRequest(buildApiUrl('/printing/queue'));
    },

    addToQueue(data: { filename: string; projectId: string; priority?: number }) {
      return service.makeRequest(buildApiUrl('/printing/queue'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    removeFromQueue(id: string) {
      return service.makeRequest(buildApiUrl(`/printing/queue/${id}`), {
        method: 'DELETE',
      });
    },

    reorderQueue(items: Array<{ id: string; position: number }>) {
      return service.makeRequest(buildApiUrl('/printing/queue/reorder'), {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },

    startQueueJob(id: string) {
      return service.makeRequest(buildApiUrl(`/printing/queue/${id}/start`), {
        method: 'POST',
      });
    },

    clearQueue() {
      return service.makeRequest(buildApiUrl('/printing/queue'), {
        method: 'DELETE',
      });
    },

    getPrintFiles() {
      return service.makeRequest(buildApiUrl('/printing/files'));
    },

    uploadFiles(formData: FormData) {
      return service.makeRequest(buildApiUrl('/printing/files/upload'), {
        method: 'POST',
        body: formData,
      });
    },

    deleteFile(filename: string) {
      return service.makeRequest(buildApiUrl(`/printing/files/${encodeURIComponent(filename)}`), {
        method: 'DELETE',
      });
    },

    linkFileToProject(filename: string, input: PrintFileLinkInput) {
      const validated = validate(printFileLinkSchema, input);
      return service.makeRequest(buildApiUrl(`/printing/files/${encodeURIComponent(filename)}/link`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    unlinkFile(filename: string) {
      return service.makeRequest(buildApiUrl(`/printing/files/${encodeURIComponent(filename)}/link`), {
        method: 'DELETE',
      });
    },

    getActiveJobs() {
      return service.makeRequest(buildApiUrl('/printing/jobs/active'));
    },

    getJobHistory(limit?: number) {
      return service.makeRequest(buildApiUrl(`/printing/jobs/history?limit=${limit}`));
    },

    getJob(jobId: string) {
      return service.makeRequest(buildApiUrl(`/printing/jobs/${jobId}`));
    },

    linkJobToProject(jobId: string, input: PrintJobLinkInput) {
      const validated = validate(printJobLinkSchema, input);
      return service.makeRequest(buildApiUrl(`/printing/jobs/${jobId}/link`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateJobStatus(jobId: string, input: PrintJobStatusUpdateInput) {
      const validated = validate(printJobStatusUpdateSchema, input);
      return service.makeRequest(buildApiUrl(`/printing/jobs/${jobId}/status`), {
        method: 'PATCH',
        body: JSON.stringify(validated),
      });
    },

    getEstimate(input: PrintEstimateInput) {
      const validated = validate(printEstimateSchema, input);
      return service.makeRequest(buildApiUrl('/printing/estimate'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    getProjectStats(projectId: string) {
      return service.makeRequest(buildApiUrl(`/printing/projects/${projectId}/stats`));
    },

    getProjectFiles(projectId: string) {
      return service.makeRequest(buildApiUrl(`/printing/projects/${projectId}/files`));
    },
  };
}
