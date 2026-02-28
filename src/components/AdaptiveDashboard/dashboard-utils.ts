/**
 * Helper functions for the AdaptiveDashboard component
 */

import type { LucideIcon } from 'lucide-react';
import {
  Folder,
  MessageSquare,
  Zap,
  Target,
  ArrowRight,
  Puzzle,
} from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import type { CurrentContext, WorkspaceMode } from '@/store';

export interface ContextualCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action: () => void;
  badge: string;
  color: string;
}

export function getWelcomeMessage(
  userName: string | undefined,
  currentContext: string,
  state: {
    activeProject?: { name: string } | null;
    activeConversation?: { name: string } | null;
    activeOrganization?: { name: string } | null;
    activeTeam?: { name: string } | null;
  }
): string {
  const timeOfDay = new Date().getHours() < 12 ? 'morning' :
                   new Date().getHours() < 17 ? 'afternoon' : 'evening';

  const contextMessages: Record<string, string> = {
    dashboard: `Good ${timeOfDay}, ${userName}! Ready to create something amazing?`,
    project: `Working on ${state.activeProject?.name}`,
    conversation: `Discussing: ${state.activeConversation?.name}`,
    organization: `Managing ${state.activeOrganization?.name}`,
    team: `Collaborating with ${state.activeTeam?.name}`,
  };

  return contextMessages[currentContext] || contextMessages.dashboard;
}

export function getContextualCards(
  state: {
    activeProject?: { name: string; description?: string; status?: string } | null;
    activeConversation?: { name: string; participants?: unknown[]; unreadCount?: number } | null;
    currentWorkflow?: { title: string; description: string; completed?: boolean } | null;
  },
  actions: {
    setContext: (context: CurrentContext, mode?: WorkspaceMode) => void;
    getContextualActions: () => Array<{
      title: string;
      description: string;
      type: string;
      action: () => void;
      priority: string;
    }> | undefined;
  },
  navigate: NavigateFunction
): ContextualCard[] {
  const cards: ContextualCard[] = [];

  cards.push({
    id: 'integrations-cta',
    title: 'Connect Your Tools',
    description: 'Unlock powerful workflows with Figma, Slack, and GitHub integrations',
    icon: Puzzle,
    action: () => navigate('/settings'),
    badge: '3 available',
    color: 'blue',
  });

  if (state.activeProject) {
    cards.push({
      id: 'current-project',
      title: state.activeProject.name,
      description: state.activeProject.description || 'Active project',
      icon: Folder,
      action: () => actions.setContext('project'),
      badge: state.activeProject.status || '',
      color: 'blue',
    });
  }

  if (state.activeConversation) {
    cards.push({
      id: 'current-conversation',
      title: state.activeConversation.name,
      description: `${(state.activeConversation as { participants?: unknown[] }).participants?.length || 0} participants`,
      icon: MessageSquare,
      action: () => actions.setContext('conversation'),
      badge: `${(state.activeConversation as { unreadCount?: number }).unreadCount || 0} unread`,
      color: 'green',
    });
  }

  if (state.currentWorkflow) {
    cards.push({
      id: 'current-workflow',
      title: state.currentWorkflow.title,
      description: state.currentWorkflow.description,
      icon: Target,
      action: () => {},
      badge: state.currentWorkflow.completed ? 'Completed' : 'In Progress',
      color: 'purple',
    });
  }

  const topSuggestions = (actions.getContextualActions() || []).slice(0, 3);
  topSuggestions.forEach((suggestion, index) => {
    cards.push({
      id: `suggestion-${index}`,
      title: suggestion.title,
      description: suggestion.description,
      icon: suggestion.type === 'action' ? Zap : suggestion.type === 'workflow' ? Target : ArrowRight,
      action: suggestion.action,
      badge: suggestion.priority,
      color: suggestion.priority === 'high' ? 'red' : suggestion.priority === 'medium' ? 'orange' : 'gray',
    });
  });

  return cards;
}
