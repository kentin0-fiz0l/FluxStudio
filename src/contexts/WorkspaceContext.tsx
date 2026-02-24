/* eslint-disable react-refresh/only-export-components */
/**
 * WorkspaceContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand uiSlice.
 * All state now lives in src/store/slices/uiSlice.ts.
 *
 * New code should import from '@/store' instead:
 *   import { useWorkspace } from '@/store';
 */

import { ReactNode } from 'react';
import { useStore } from '../store/store';

// ============================================================================
// Types (kept for backward compat imports)
// ============================================================================

export type WorkspaceMode = 'focus' | 'overview' | 'collaboration' | 'review';
export type CurrentContext = 'dashboard' | 'project' | 'conversation' | 'organization' | 'team';

export interface WorkspaceActivity {
  id: string;
  type: 'message' | 'file_upload' | 'project_update' | 'project_created' | 'conversation_created' | 'review_completed' | 'automation_enabled' | 'ai_feedback';
  title: string;
  description: string;
  timestamp: Date;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  conversationId?: string;
  userId: string;
  userName: string;
  metadata?: Record<string, unknown>;
}

export interface ContextualSuggestion {
  id: string;
  type: 'action' | 'navigation' | 'workflow' | 'integration';
  title: string;
  description: string;
  action: () => void;
  priority: 'low' | 'medium' | 'high';
  context: string[];
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  actions: Array<{
    id: string;
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
}

export interface WorkspaceState {
  currentContext: CurrentContext;
  currentMode: WorkspaceMode;
  activeOrganization: unknown;
  activeTeam: unknown;
  activeProject: unknown;
  activeConversation: unknown;
  projectConversations: Map<string, unknown[]>;
  conversationProjects: Map<string, unknown>;
  recentActivity: WorkspaceActivity[];
  contextualSuggestions: ContextualSuggestion[];
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentWorkflow: WorkflowStep | null;
  loadingStates: Map<string, boolean>;
  lastUpdated: Map<string, Date>;
}

// ============================================================================
// Deprecated Provider (no-op passthrough)
// ============================================================================

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ============================================================================
// Deprecated Hook (delegate to Zustand)
// ============================================================================

/** @deprecated Import useWorkspace from '@/store' instead. */
export function useWorkspace() {
  const ui = useStore((s) => s.ui);
  const projects = useStore((s) => s.projects);

  const activeProject = projects.activeProjectId
    ? projects.projects.find((p) => p.id === projects.activeProjectId) || null
    : null;

  return {
    state: {
      currentContext: ui.currentContext,
      currentMode: ui.currentMode,
      activeOrganization: null,
      activeTeam: null,
      activeProject,
      activeConversation: null,
      projectConversations: new Map(),
      conversationProjects: new Map(),
      recentActivity: ui.recentActivity as unknown as WorkspaceActivity[],
      contextualSuggestions: [],
      sidebarCollapsed: ui.sidebarCollapsed,
      commandPaletteOpen: ui.commandPaletteOpen,
      currentWorkflow: ui.currentWorkflow as unknown as WorkflowStep | null,
      loadingStates: new Map(),
      lastUpdated: new Map(),
    },
     
    dispatch: () => {},
    actions: {
      setContext: ui.setContext,
      addActivity: ui.addActivity,
      toggleSidebar: ui.toggleSidebar,
      openCommandPalette: ui.openCommandPalette,
      closeCommandPalette: ui.closeCommandPalette,
      startWorkflow: ui.startWorkflow,
      completeWorkflowStep: ui.completeWorkflowStep,
      setActiveProject: (_project: unknown) => {},
      setActiveOrganization: (_org: unknown) => {},
      setActiveTeam: (_team: unknown) => {},
      setActiveConversation: (_conversation: unknown) => {},
      linkProjectConversation: (_projectId: string, _conversationId: string) => {},
      setSuggestions: (_suggestions: ContextualSuggestion[]) => {},
      isLoading: ui.isWorkspaceLoading,
      getCurrentBreadcrumbs: () => [],
      getContextualActions: () => [],
      getProjectConversations: (_projectId: string) => [],
      getConversationProject: (_conversationId: string) => null,
    },
  };
}

export default null;
