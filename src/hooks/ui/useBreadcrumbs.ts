/**
 * useBreadcrumbs — Auto-generate breadcrumbs from current route
 *
 * Maps URL segments to human-readable labels. Supports dynamic segments
 * (e.g., :projectId resolved via project name lookup).
 *
 * Sprint 55: Auto-generating breadcrumbs
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

/** Static segment → label mapping */
const SEGMENT_LABELS: Record<string, string> = {
  projects: 'Projects',
  new: 'New Project',
  overview: 'Overview',
  formations: 'Formation Editor',
  messages: 'Messages',
  settings: 'Settings',
  organization: 'Organization',
  notifications: 'Notifications',
  profile: 'Profile',
  tools: 'Tools',
  home: 'Dashboard',
  help: 'Help Center',
  billing: 'Billing',
  boards: 'Design Board',
  templates: 'Templates',
};

/** Routes where breadcrumbs should not be generated */
const EXCLUDED_ROUTES = new Set([
  '/login',
  '/signup',
  '/signup/classic',
  '/landing',
  '/try',
  '/terms',
  '/privacy',
  '/pricing',
  '/',
]);

interface UseBreadcrumbsOptions {
  /** Override label for a dynamic segment like projectId */
  projectName?: string;
  /** Override label for formationId segment */
  formationName?: string;
  /** Additional breadcrumbs to append */
  extra?: BreadcrumbItem[];
}

export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}): BreadcrumbItem[] {
  const location = useLocation();
  const params = useParams();

  return useMemo(() => {
    const pathname = location.pathname;

    if (EXCLUDED_ROUTES.has(pathname)) return [];

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [];

    const crumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      // Check if this segment is a dynamic param value
      const isProjectId = params.projectId === segment || params.id === segment;
      const isFormationId = params.formationId === segment;

      let label: string;

      if (isProjectId) {
        label = options.projectName || 'Project';
      } else if (isFormationId) {
        label = options.formationName || 'Formation';
      } else if (SEGMENT_LABELS[segment]) {
        label = SEGMENT_LABELS[segment];
      } else {
        // Unknown segment — skip or use capitalized version
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }

      const isLast = i === segments.length - 1;

      crumbs.push({
        label,
        path: isLast ? undefined : currentPath,
      });
    }

    // Append extra breadcrumbs if provided
    if (options.extra) {
      crumbs.push(...options.extra);
    }

    return crumbs;
  }, [location.pathname, params, options.projectName, options.formationName, options.extra]);
}
