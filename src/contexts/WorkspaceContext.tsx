/**
 * Unified Workspace Context
 * Single source of truth for all user context, workflows, and cross-feature state
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { Organization, Team, Project } from '../types/organization';
import { Conversation } from '../types/messaging';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { useMessaging } from './MessagingContext';

// Workspace state types
export type WorkspaceMode = 'focus' | 'overview' | 'collaboration' | 'review';
export type CurrentContext = 'dashboard' | 'project' | 'conversation' | 'organization' | 'team';

export interface WorkspaceState {
  // Current context
  currentContext: CurrentContext;
  currentMode: WorkspaceMode;

  // Active entities
  activeOrganization: Organization | null;
  activeTeam: Team | null;
  activeProject: Project | null;
  activeConversation: Conversation | null;

  // Cross-feature connections
  projectConversations: Map<string, Conversation[]>; // projectId -> conversations
  conversationProjects: Map<string, Project>; // conversationId -> project

  // Activity and notifications
  recentActivity: WorkspaceActivity[];
  contextualSuggestions: ContextualSuggestion[];

  // UI state
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentWorkflow: WorkflowStep | null;

  // Performance and caching
  loadingStates: Map<string, boolean>;
  lastUpdated: Map<string, Date>;
}

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
  metadata?: Record<string, any>;
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

// Action types
type WorkspaceAction =
  | { type: 'SET_CONTEXT'; payload: { context: CurrentContext; mode?: WorkspaceMode } }
  | { type: 'SET_ACTIVE_ORGANIZATION'; payload: Organization | null }
  | { type: 'SET_ACTIVE_TEAM'; payload: Team | null }
  | { type: 'SET_ACTIVE_PROJECT'; payload: Project | null }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: Conversation | null }
  | { type: 'LINK_PROJECT_CONVERSATION'; payload: { projectId: string; conversationId: string } }
  | { type: 'ADD_ACTIVITY'; payload: WorkspaceActivity }
  | { type: 'SET_SUGGESTIONS'; payload: ContextualSuggestion[] }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_COMMAND_PALETTE_OPEN'; payload: boolean }
  | { type: 'START_WORKFLOW'; payload: WorkflowStep }
  | { type: 'UPDATE_WORKFLOW_STEP'; payload: { stepId: string; completed: boolean } }
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } };

// Initial state
const initialState: WorkspaceState = {
  currentContext: 'dashboard',
  currentMode: 'overview',
  activeOrganization: null,
  activeTeam: null,
  activeProject: null,
  activeConversation: null,
  projectConversations: new Map(),
  conversationProjects: new Map(),
  recentActivity: [],
  contextualSuggestions: [],
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  currentWorkflow: null,
  loadingStates: new Map(),
  lastUpdated: new Map(),
};

// Reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_CONTEXT':
      return {
        ...state,
        currentContext: action.payload.context,
        currentMode: action.payload.mode || state.currentMode,
      };

    case 'SET_ACTIVE_ORGANIZATION':
      return {
        ...state,
        activeOrganization: action.payload,
        // Clear team and project if organization changes
        activeTeam: action.payload ? state.activeTeam : null,
        activeProject: action.payload ? state.activeProject : null,
      };

    case 'SET_ACTIVE_TEAM':
      return {
        ...state,
        activeTeam: action.payload,
        // Clear project if team changes
        activeProject: action.payload ? state.activeProject : null,
      };

    case 'SET_ACTIVE_PROJECT':
      return {
        ...state,
        activeProject: action.payload,
        currentContext: action.payload ? 'project' : state.currentContext,
      };

    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        activeConversation: action.payload,
        currentContext: action.payload ? 'conversation' : state.currentContext,
      };

    case 'LINK_PROJECT_CONVERSATION':
      const newProjectConversations = new Map(state.projectConversations);
      const newConversationProjects = new Map(state.conversationProjects);

      // Find the conversation and project
      const { projectId, conversationId } = action.payload;

      // Add to project->conversations mapping
      const existingConversations = newProjectConversations.get(projectId) || [];
      // Add only if not already linked
      if (!existingConversations.find(c => c.id === conversationId)) {
        const updatedConversations = [...existingConversations];
        // We'll need to get the actual conversation object from messaging context
        newProjectConversations.set(projectId, updatedConversations);
      }

      // Add to conversation->project mapping
      // TODO: This should look up and store the actual Project object, not the action payload
      newConversationProjects.set(conversationId, action.payload as unknown as Project);

      return {
        ...state,
        projectConversations: newProjectConversations,
        conversationProjects: newConversationProjects,
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        recentActivity: [action.payload, ...(state.recentActivity || [])].slice(0, 50), // Keep last 50 items
      };

    case 'SET_SUGGESTIONS':
      return {
        ...state,
        contextualSuggestions: action.payload,
      };

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };

    case 'SET_COMMAND_PALETTE_OPEN':
      return {
        ...state,
        commandPaletteOpen: action.payload,
      };

    case 'START_WORKFLOW':
      return {
        ...state,
        currentWorkflow: action.payload,
      };

    case 'UPDATE_WORKFLOW_STEP':
      if (!state.currentWorkflow || state.currentWorkflow.id !== action.payload.stepId) {
        return state;
      }
      return {
        ...state,
        currentWorkflow: {
          ...state.currentWorkflow,
          completed: action.payload.completed,
        },
      };

    case 'SET_LOADING':
      const newLoadingStates = new Map(state.loadingStates);
      newLoadingStates.set(action.payload.key, action.payload.loading);
      return {
        ...state,
        loadingStates: newLoadingStates,
      };

    default:
      return state;
  }
}

// Context
interface WorkspaceContextType {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  actions: {
    setContext: (context: CurrentContext, mode?: WorkspaceMode) => void;
    setActiveOrganization: (org: Organization | null) => void;
    setActiveTeam: (team: Team | null) => void;
    setActiveProject: (project: Project | null) => void;
    setActiveConversation: (conversation: Conversation | null) => void;
    linkProjectConversation: (projectId: string, conversationId: string) => void;
    addActivity: (activity: Omit<WorkspaceActivity, 'id' | 'timestamp'>) => void;
    setSuggestions: (suggestions: ContextualSuggestion[]) => void;
    toggleSidebar: () => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    startWorkflow: (workflow: Omit<WorkflowStep, 'current'>) => void;
    completeWorkflowStep: (stepId: string) => void;

    // Computed helpers
    isLoading: (key: string) => boolean;
    getCurrentBreadcrumbs: () => Array<{ label: string; path: string; current: boolean }>;
    getContextualActions: () => ContextualSuggestion[];
    getProjectConversations: (projectId: string) => Conversation[];
    getConversationProject: (conversationId: string) => Project | null;
  };
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Provider
interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const { user: _user } = useAuth();
  const { currentOrganization, currentTeam, currentProject } = useOrganization();
  const { state: _messagingState } = useMessaging();

  // Sync with organization context
  useEffect(() => {
    if (currentOrganization !== state.activeOrganization) {
      dispatch({ type: 'SET_ACTIVE_ORGANIZATION', payload: currentOrganization });
    }
  }, [currentOrganization, state.activeOrganization]);

  useEffect(() => {
    if (currentTeam !== state.activeTeam) {
      dispatch({ type: 'SET_ACTIVE_TEAM', payload: currentTeam });
    }
  }, [currentTeam, state.activeTeam]);

  useEffect(() => {
    if (currentProject !== state.activeProject) {
      dispatch({ type: 'SET_ACTIVE_PROJECT', payload: currentProject });
    }
  }, [currentProject, state.activeProject]);

  // Generate contextual suggestions based on current state
  useEffect(() => {
    const suggestions: ContextualSuggestion[] = [];

    // Add suggestions based on current context
    if (state.activeProject && !state.activeConversation) {
      suggestions.push({
        id: 'start-project-conversation',
        type: 'action',
        title: 'Start Project Discussion',
        description: 'Create a conversation for this project',
        action: () => {
          // Will implement conversation creation
        },
        priority: 'medium',
        context: ['project'],
      });
    }

    if (state.currentContext === 'dashboard' && state.recentActivity.length === 0) {
      suggestions.push({
        id: 'explore-features',
        type: 'navigation',
        title: 'Explore Flux Studio',
        description: 'Take a tour of available features',
        action: () => {
          // Will implement feature tour
        },
        priority: 'low',
        context: ['dashboard'],
      });
    }

    dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
  }, [state.activeProject, state.activeConversation, state.currentContext, state.recentActivity.length]);

  // Actions - memoized to prevent infinite re-renders
  const actions = useMemo(() => ({
    setContext: (context: CurrentContext, mode?: WorkspaceMode) => {
      dispatch({ type: 'SET_CONTEXT', payload: { context, mode } });
    },

    setActiveOrganization: (org: Organization | null) => {
      dispatch({ type: 'SET_ACTIVE_ORGANIZATION', payload: org });
    },

    setActiveTeam: (team: Team | null) => {
      dispatch({ type: 'SET_ACTIVE_TEAM', payload: team });
    },

    setActiveProject: (project: Project | null) => {
      dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project });
    },

    setActiveConversation: (conversation: Conversation | null) => {
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
    },

    linkProjectConversation: (projectId: string, conversationId: string) => {
      dispatch({ type: 'LINK_PROJECT_CONVERSATION', payload: { projectId, conversationId } });
    },

    addActivity: (activity: Omit<WorkspaceActivity, 'id' | 'timestamp'>) => {
      const fullActivity: WorkspaceActivity = {
        ...activity,
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_ACTIVITY', payload: fullActivity });
    },

    setSuggestions: (suggestions: ContextualSuggestion[]) => {
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    },

    toggleSidebar: () => {
      dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !state.sidebarCollapsed });
    },

    openCommandPalette: () => {
      dispatch({ type: 'SET_COMMAND_PALETTE_OPEN', payload: true });
    },

    closeCommandPalette: () => {
      dispatch({ type: 'SET_COMMAND_PALETTE_OPEN', payload: false });
    },

    startWorkflow: (workflow: Omit<WorkflowStep, 'current'>) => {
      const fullWorkflow: WorkflowStep = {
        ...workflow,
        current: true,
      };
      dispatch({ type: 'START_WORKFLOW', payload: fullWorkflow });
    },

    completeWorkflowStep: (stepId: string) => {
      dispatch({ type: 'UPDATE_WORKFLOW_STEP', payload: { stepId, completed: true } });
    },

    // Computed helpers
    isLoading: (key: string) => {
      return state.loadingStates.get(key) || false;
    },

    getCurrentBreadcrumbs: () => {
      const breadcrumbs: Array<{ label: string; path: string; current: boolean }> = [];

      if (state.activeOrganization) {
        breadcrumbs.push({
          label: state.activeOrganization.name,
          path: `/dashboard/organization/${state.activeOrganization.id}`,
          current: false,
        });
      }

      if (state.activeTeam) {
        breadcrumbs.push({
          label: state.activeTeam.name,
          path: `/dashboard/organization/${state.activeOrganization?.id}/team/${state.activeTeam.id}`,
          current: false,
        });
      }

      if (state.activeProject) {
        breadcrumbs.push({
          label: state.activeProject.name,
          path: `/dashboard/projects/${state.activeProject.id}`,
          current: state.currentContext === 'project',
        });
      }

      if (state.activeConversation) {
        breadcrumbs.push({
          label: state.activeConversation.name,
          path: `/dashboard/messages`,
          current: state.currentContext === 'conversation',
        });
      }

      return breadcrumbs;
    },

    getContextualActions: () => {
      const suggestions = state.contextualSuggestions || [];
      return suggestions.filter(suggestion =>
        suggestion.context.includes(state.currentContext)
      );
    },

    getProjectConversations: (projectId: string) => {
      return state.projectConversations.get(projectId) || [];
    },

    getConversationProject: (conversationId: string) => {
      return state.conversationProjects.get(conversationId) || null;
    },
  }), [state]);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export default WorkspaceContext;