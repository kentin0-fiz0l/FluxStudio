/**
 * Template Project Creator
 *
 * Creates projects from onboarding templates (Drill Design, Practice Chart, Custom).
 * Returns a redirect path so the onboarding flow can navigate the user into the tool.
 */

import { apiService } from '@/services/apiService';

export type TemplateType = 'drill' | 'practice-chart' | 'custom';

interface CreateProjectResult {
  projectId: string;
  redirectPath: string;
}

const TEMPLATE_DEFAULTS: Record<TemplateType, { name: string; template: string; status: string; priority: string }> = {
  drill: {
    name: 'My Drill Design',
    template: 'marching-band',
    status: 'planning',
    priority: 'medium',
  },
  'practice-chart': {
    name: 'My Practice Chart',
    template: 'indoor-winds',
    status: 'planning',
    priority: 'medium',
  },
  custom: {
    name: 'My Project',
    template: 'blank',
    status: 'planning',
    priority: 'medium',
  },
};

export async function createProjectFromTemplate(
  templateType: TemplateType,
  _userId: string,
): Promise<CreateProjectResult> {
  const defaults = TEMPLATE_DEFAULTS[templateType];

  const result = await apiService.post<{ data?: { id: string }; id?: string }>('/projects', defaults);

  const project = result.data?.data || result.data;
  const projectId = project?.id ?? '';

  const redirectPaths: Record<TemplateType, string> = {
    drill: `/projects/${projectId}/formations`,
    'practice-chart': `/projects/${projectId}/metmap`,
    custom: `/projects/${projectId}`,
  };

  return {
    projectId,
    redirectPath: redirectPaths[templateType],
  };
}
