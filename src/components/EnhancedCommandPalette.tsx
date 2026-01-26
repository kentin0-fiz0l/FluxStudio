/**
 * Enhanced Command Palette
 * Context-aware command interface that adapts to current workspace state
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Search,
  MessageSquare,
  Folder,
  Users,
  Zap,
  Target,
  ArrowRight,
  Clock,
  Plus,
  Activity,
  Building2,
  Command
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useMessaging } from '../hooks/useMessaging';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Conversation } from '../types/messaging';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'navigation' | 'actions' | 'create' | 'search' | 'workflows' | 'recent';
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  score?: number;
  context?: string[];
  priority?: number;
}

export function EnhancedCommandPalette() {
  const { state, actions } = useWorkspace();
  useAuth(); // Reserved for user context
  const { organizations, projects } = useOrganization();
  const { conversations } = useMessaging();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);

  // Generate dynamic commands based on current context
  const generateCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // Navigation commands
    commands.push(
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        description: 'Go to main dashboard',
        category: 'navigation',
        icon: Activity,
        shortcut: '⌘D',
        action: () => navigate('/dashboard'),
        priority: 10
      },
      {
        id: 'nav-messages',
        title: 'Messages',
        description: 'Open messaging center',
        category: 'navigation',
        icon: MessageSquare,
        shortcut: '⌘M',
        action: () => console.log('Opening messaging sidepanel...'),
        priority: 9
      },
      {
        id: 'nav-organizations',
        title: 'Organizations',
        description: 'Manage organizations',
        category: 'navigation',
        icon: Building2,
        action: () => navigate('/dashboard/organizations'),
        priority: 8
      }
    );

    // Creation commands
    commands.push(
      {
        id: 'create-project',
        title: 'New Project',
        description: 'Create a new creative project',
        category: 'create',
        icon: Plus,
        shortcut: '⌘N',
        action: () => {
          // Will implement project creation workflow
          actions.startWorkflow({
            id: 'create-project',
            workflowId: 'project-creation',
            title: 'Create New Project',
            description: 'Set up a new creative project',
            completed: false,
            actions: []
          });
        },
        priority: 10
      },
      {
        id: 'create-conversation',
        title: 'New Conversation',
        description: 'Start a new conversation',
        category: 'create',
        icon: MessageSquare,
        shortcut: '⌘⇧N',
        action: () => {
          console.log('Opening messaging sidepanel...');
          // Will trigger new conversation creation
        },
        priority: 9
      }
    );

    // Context-specific commands
    if (state.activeProject) {
      commands.push({
        id: 'project-details',
        title: `View ${state.activeProject.name}`,
        description: 'Open current project details',
        category: 'navigation',
        icon: Folder,
        action: () => navigate(`/dashboard/projects/${state.activeProject!.id}`),
        context: ['project'],
        priority: 15
      });
    }

    if (state.activeConversation) {
      commands.push({
        id: 'conversation-details',
        title: `Open ${state.activeConversation.name}`,
        description: 'View conversation details',
        category: 'navigation',
        icon: MessageSquare,
        action: () => {
          console.log('Opening messaging sidepanel...');
          // Will focus on specific conversation
        },
        context: ['conversation'],
        priority: 15
      });
    }

    // Quick access to organizations, projects, conversations
    organizations.forEach(org => {
      commands.push({
        id: `org-${org.id}`,
        title: org.name,
        description: 'Switch to organization',
        category: 'navigation',
        icon: Building2,
        action: () => navigate(`/dashboard/organization/${org.id}`),
        priority: 5
      });
    });

    (projects || []).slice(0, 5).forEach(project => {
      commands.push({
        id: `project-${project.id}`,
        title: project.name,
        description: `${project.status} project`,
        category: 'navigation',
        icon: Folder,
        action: () => navigate(`/dashboard/projects/${project.id}`),
        priority: 6
      });
    });

    (conversations || []).slice(0, 5).forEach((conv: Conversation) => {
      commands.push({
        id: `conv-${conv.id}`,
        title: conv.name,
        description: `${conv.participants?.length || 0} participants`,
        category: 'navigation',
        icon: MessageSquare,
        action: () => {
          console.log('Opening messaging sidepanel...');
          actions.setActiveConversation(conv);
        },
        priority: 6
      });
    });

    // Recent activity commands
    (state?.recentActivity || []).slice(0, 3).forEach(activity => {
      commands.push({
        id: `activity-${activity.id}`,
        title: activity.title,
        description: activity.description,
        category: 'recent',
        icon: Clock,
        action: () => {
          // Navigate based on activity type
          if (activity.projectId) {
            navigate(`/dashboard/projects/${activity.projectId}`);
          } else if (activity.conversationId) {
            console.log('Opening messaging sidepanel...');
          }
        },
        priority: 3
      });
    });

    // Contextual suggestions as commands
    actions.getContextualActions().forEach(suggestion => {
      commands.push({
        id: `suggestion-${suggestion.id}`,
        title: suggestion.title,
        description: suggestion.description,
        category: 'actions',
        icon: suggestion.type === 'action' ? Zap : Target,
        action: suggestion.action,
        priority: suggestion.priority === 'high' ? 12 : suggestion.priority === 'medium' ? 8 : 4
      });
    });

    // Mode switching commands
    commands.push(
      {
        id: 'mode-focus',
        title: 'Focus Mode',
        description: 'Switch to focused work mode',
        category: 'actions',
        icon: Target,
        action: () => actions.setContext(state.currentContext, 'focus'),
        priority: 7
      },
      {
        id: 'mode-collaboration',
        title: 'Collaboration Mode',
        description: 'Switch to collaborative mode',
        category: 'actions',
        icon: Users,
        action: () => actions.setContext(state.currentContext, 'collaboration'),
        priority: 7
      }
    );

    return commands.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [state, organizations, projects, conversations, actions, navigate]);

  // Filter commands based on query
  useEffect(() => {
    const commands = generateCommands();

    if (!query.trim()) {
      setFilteredCommands(commands.slice(0, 10));
      setSelectedIndex(0);
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = commands
      .map(command => {
        let score = 0;

        // Title match (highest priority)
        if (command.title.toLowerCase().includes(queryLower)) {
          score += command.title.toLowerCase().startsWith(queryLower) ? 100 : 50;
        }

        // Description match
        if (command.description?.toLowerCase().includes(queryLower)) {
          score += 20;
        }

        // Category match
        if (command.category.toLowerCase().includes(queryLower)) {
          score += 10;
        }

        // Context relevance boost
        if (command.context?.includes(state.currentContext)) {
          score += 30;
        }

        // Priority boost
        score += (command.priority || 0) * 2;

        return { ...command, score };
      })
      .filter(command => command.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, generateCommands, state.currentContext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.commandPaletteOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            actions.closeCommandPalette();
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          actions.closeCommandPalette();
          setQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.commandPaletteOpen, filteredCommands, selectedIndex, actions]);

  // Global shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        actions.openCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return ArrowRight;
      case 'actions': return Zap;
      case 'create': return Plus;
      case 'search': return Search;
      case 'workflows': return Target;
      case 'recent': return Clock;
      default: return Command;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'text-blue-600 bg-blue-100';
      case 'actions': return 'text-purple-600 bg-purple-100';
      case 'create': return 'text-green-600 bg-green-100';
      case 'search': return 'text-orange-600 bg-orange-100';
      case 'workflows': return 'text-red-600 bg-red-100';
      case 'recent': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!state.commandPaletteOpen) return null;

  return (
    <Dialog open={state.commandPaletteOpen} onOpenChange={actions.closeCommandPalette}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search size={16} className="text-gray-400 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, projects, conversations..."
            className="border-0 outline-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <kbd className="ml-auto pointer-events-none text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            ⌘K
          </kbd>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-2">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-sm">Try searching for projects, conversations, or actions</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCommands.map((command, index) => {
                  const Icon = command.icon;
                  // Category icon available for future use: getCategoryIcon(command.category)

                  return (
                    <div
                      key={command.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                        index === selectedIndex
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      )}
                      onClick={() => {
                        command.action();
                        actions.closeCommandPalette();
                        setQuery('');
                      }}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        getCategoryColor(command.category)
                      )}>
                        <Icon size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {command.title}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {command.category}
                          </Badge>
                        </div>
                        {command.description && (
                          <p className="text-sm text-gray-600 truncate">
                            {command.description}
                          </p>
                        )}
                      </div>

                      {command.shortcut && (
                        <kbd className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {command.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-gray-500 bg-gray-50">
          <div className="flex items-center justify-between">
            <span>
              {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} available
            </span>
            <div className="flex items-center gap-4">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedCommandPalette;