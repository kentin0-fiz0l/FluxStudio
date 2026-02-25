/**
 * Analytics Convenience Helpers
 *
 * Thin wrappers around observability.analytics.track() for key growth events.
 * Use these instead of raw track() calls to keep event names consistent
 * across the codebase and make it easy to grep for instrumented events.
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics';
 *   analytics.signupComplete({ method: 'email' });
 */

import { observability } from '@/services/observability';

export const analytics = {
  /**
   * Fired after a successful signup (email or OAuth).
   */
  signupComplete(props: { method: string; userType?: string }) {
    observability.analytics.track('signup_complete', props);
  },

  /**
   * Fired when a project is created (blank, from template, or via AI).
   */
  projectCreated(props: { mode: string; projectId?: string; templateId?: string }) {
    observability.analytics.track('project_created', props);
  },

  /**
   * Fired when a formation is saved.
   */
  formationSaved(props: { formationId?: string; projectId?: string }) {
    observability.analytics.track('formation_saved', props);
  },

  /**
   * Fired when a user selects / applies a template.
   */
  templateUsed(props: { templateId: string; templateName: string; category: string; source?: string }) {
    observability.analytics.track('template_used', props);
  },
} as const;

export default analytics;
