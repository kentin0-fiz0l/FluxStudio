/**
 * ProgressiveProfileCapture - Non-blocking profile field collection
 *
 * Renders nothing visually on mount. Over the first 7 days after account
 * creation, shows non-blocking toasts/small modals asking for profile fields
 * that weren't collected during the streamlined onboarding flow.
 *
 * Time-based schedule:
 *   Day 1 - Organization name
 *   Day 2 - Team size
 *   Day 3 - Primary use case
 *   Day 5 - Notification preferences
 *
 * Contextual triggers (shown once per context):
 *   - Name: prompt after first project save (if name is empty from OAuth)
 *   - Organization: prompt when user first invites a collaborator
 *   - Ensemble size: prompt when creating a formation with >0 performers
 *
 * Each prompt is shown at most once and is dismissible.
 * Responses are sent via PATCH /api/auth/profile.
 */

import { useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { apiService } from '@/services/apiService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileField {
  key: string;
  dayOffset: number;
  message: string;
}

type ContextualTrigger = 'project_saved' | 'collaborator_invited' | 'formation_created';

interface ContextualPrompt {
  key: string;
  trigger: ContextualTrigger;
  message: string;
  condition: (user: { name?: string }) => boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'progressive_profile_';
const CONTEXTUAL_PREFIX = 'progressive_ctx_';
const FIRST_LOGIN_KEY = 'progressive_profile_first_login';
const MS_PER_DAY = 86_400_000;

const PROFILE_FIELDS: ProfileField[] = [
  {
    key: 'organization_name',
    dayOffset: 1,
    message: 'What organization are you with? Set it in Settings > Organization to collaborate with your team.',
  },
  {
    key: 'team_size',
    dayOffset: 2,
    message: 'How large is your team? Knowing your team size helps us optimize your workspace.',
  },
  {
    key: 'primary_use_case',
    dayOffset: 3,
    message: 'What are you primarily using FluxStudio for? This helps us surface relevant features.',
  },
  {
    key: 'notification_preferences',
    dayOffset: 5,
    message: 'Set up your notification preferences in Settings to stay in the loop without the noise.',
  },
];

const CONTEXTUAL_PROMPTS: ContextualPrompt[] = [
  {
    key: 'name_from_oauth',
    trigger: 'project_saved',
    message: 'What should we call you? Add your name in Settings > Profile so your team knows who you are.',
    condition: (user) => !user.name || user.name.trim() === '',
  },
  {
    key: 'organization_on_invite',
    trigger: 'collaborator_invited',
    message: 'Set your organization name in Settings > Organization to give your team a shared identity.',
    condition: () => !isFieldCollected('organization_name'),
  },
  {
    key: 'ensemble_size_on_formation',
    trigger: 'formation_created',
    message: 'How many performers are in your ensemble? Set this in project settings for accurate formation layouts.',
    condition: () => true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFirstLoginTimestamp(): number {
  const stored = localStorage.getItem(FIRST_LOGIN_KEY);
  if (stored) return parseInt(stored, 10);

  const now = Date.now();
  localStorage.setItem(FIRST_LOGIN_KEY, String(now));
  return now;
}

function isFieldCollected(key: string): boolean {
  return localStorage.getItem(`${STORAGE_PREFIX}${key}`) === 'done';
}

function markFieldCollected(key: string): void {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, 'done');
}

function isContextualPromptShown(key: string): boolean {
  return localStorage.getItem(`${CONTEXTUAL_PREFIX}${key}`) === 'done';
}

function markContextualPromptShown(key: string): void {
  localStorage.setItem(`${CONTEXTUAL_PREFIX}${key}`, 'done');
}

function getDaysSinceFirstLogin(firstLogin: number): number {
  return Math.floor((Date.now() - firstLogin) / MS_PER_DAY);
}

/**
 * Show a contextual profile prompt for a specific trigger.
 * Call this from other components when a relevant action occurs.
 */
export function triggerContextualPrompt(trigger: ContextualTrigger, user: { name?: string }): void {
  const prompt = CONTEXTUAL_PROMPTS.find(
    p => p.trigger === trigger && !isContextualPromptShown(p.key) && p.condition(user),
  );

  if (!prompt) return;

  markContextualPromptShown(prompt.key);
  // Small delay so it doesn't interrupt the action itself
  setTimeout(() => {
    toast.info(prompt.message, { duration: 8000 });
  }, 2000);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressiveProfileCapture() {
  const submitProfileField = useCallback(async (key: string, value: string) => {
    try {
      await apiService.patch('/api/auth/profile', { [key]: value });
      markFieldCollected(key);
    } catch {
      // Non-critical - silently fail, will retry next session
    }
  }, []);

  useEffect(() => {
    const firstLogin = getFirstLoginTimestamp();
    const daysSince = getDaysSinceFirstLogin(firstLogin);

    // Don't show anything on day 0 (first session)
    if (daysSince < 1) return;

    // Find the first eligible field to prompt
    const eligible = PROFILE_FIELDS.find(
      field => daysSince >= field.dayOffset && !isFieldCollected(field.key),
    );

    if (!eligible) return;

    // Delay the prompt slightly so it doesn't interrupt initial page load
    const timer = setTimeout(() => {
      toast.info(eligible.message, { duration: 8000 });
      // Mark as shown so it won't appear again regardless of whether user acts
      markFieldCollected(eligible.key);
    }, 5000);

    return () => clearTimeout(timer);
  }, [submitProfileField]);

  // This component renders nothing
  return null;
}

export default ProgressiveProfileCapture;
