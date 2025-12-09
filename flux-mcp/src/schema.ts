/**
 * Zod schemas for MCP tool inputs and outputs
 */
import { z } from 'zod';

// Input schemas
export const CreatePreviewInputSchema = z.object({
  branch: z.string().min(1).describe('Git branch name to deploy'),
  payload: z.record(z.any()).optional().describe('Optional workflow dispatch inputs'),
});

export const TailLogsInputSchema = z.object({
  run_id: z.number().int().positive().describe('GitHub Actions run ID'),
});

// Output type definitions
export interface PreviewResponse {
  run_id: number;
  status: string;
  html_url: string;
  created_at: string;
  head_branch: string;
}

export interface LogsResponse {
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  logs_url: string;
  created_at: string;
  updated_at: string;
}
