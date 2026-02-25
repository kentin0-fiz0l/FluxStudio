/**
 * useBrowserJob - Poll a browser automation job until completion
 */

import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';

interface BrowserJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function useBrowserJob(jobId: string | null) {
  return useQuery({
    queryKey: ['browser-job', jobId],
    queryFn: async () => {
      const response = await (apiService as any).getJobStatus(jobId!);
      return response.data?.job as BrowserJob;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
  });
}
