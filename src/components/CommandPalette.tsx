import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import {
  Search,
  ArrowRight,
  Settings,
  User,
  FolderOpen,
  FileText,
  Users,
  Building,
  Palette,
  Zap,
  Command,
  Hash,
  Clock,
  Star,
} from 'lucide-react';

interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  category: 'navigation' | 'actions' | 'settings' | 'search' | 'recent';
  action: () => void;
  shortcut?: string;
  requiresAuth?: boolean;
  permissions?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { updateSettings } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flux-command-palette-recent');
      if (stored) {
        setRecentCommands(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load recent commands:', error);
    }
  }, []);

  // Save recent commands to localStorage
  const saveRecentCommand = useCallback((commandId: string) => {
    const updated = [commandId, ...recentCommands.filter(id => id !== commandId)].slice(0, 10);
    setRecentCommands(updated);
    try {
      localStorage.setItem('flux-command-palette-recent', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent commands:', error);
    }
  }, [recentCommands]);

  // Define available commands
  const commands: CommandAction[] = useMemo(() => [
    // Navigation Commands
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'Return to your main dashboard',
      icon: FolderOpen,
      keywords: ['dashboard', 'home', 'main'],
      category: 'navigation',
      action: () => window.location.href = '/dashboard/unified',
      shortcut: 'Cmd+H',
    },
    {
      id: 'nav-projects',
      title: 'View All Projects',
      description: 'Browse all your projects',
      icon: FileText,
      keywords: ['projects', 'browse', 'list'],
      category: 'navigation',
      action: () => window.location.href = '/dashboard/projects',
    },
    {
      id: 'nav-organizations',
      title: 'Organizations',
      description: 'Manage organizations and teams',
      icon: Building,
      keywords: ['organizations', 'teams', 'manage'],
      category: 'navigation',
      action: () => window.location.href = '/dashboard/organizations',
      requiresAuth: true,
    },

    // Action Commands
    {
      id: 'action-new-project',
      title: 'Create New Project',
      description: 'Start a new creative project',
      icon: FileText,
      keywords: ['create', 'new', 'project', 'start'],
      category: 'actions',
      action: () => navigate('/projects?create=true'),
      shortcut: 'Cmd+N',
      requiresAuth: true,
    },
    {
      id: 'action-invite-user',
      title: 'Invite Team Member',
      description: 'Invite someone to your team',
      icon: Users,
      keywords: ['invite', 'team', 'member', 'collaborate'],
      category: 'actions',
      action: () => navigate('/dashboard/teams?invite=true'),
      requiresAuth: true,
      permissions: ['admin', 'designer'],
    },

    // Settings Commands
    {
      id: 'settings-profile',
      title: 'Profile Settings',
      description: 'Update your profile information',
      icon: User,
      keywords: ['profile', 'settings', 'account', 'personal'],
      category: 'settings',
      action: () => window.location.href = '/dashboard/profile',
      requiresAuth: true,
    },
    {
      id: 'settings-theme-dark',
      title: 'Switch to Dark Theme',
      description: 'Change to default dark theme',
      icon: Palette,
      keywords: ['theme', 'dark', 'appearance'],
      category: 'settings',
      action: () => updateSettings({ variant: 'default' }),
    },
    {
      id: 'settings-theme-cosmic',
      title: 'Switch to Cosmic Theme',
      description: 'Change to cosmic purple theme',
      icon: Palette,
      keywords: ['theme', 'cosmic', 'purple', 'space'],
      category: 'settings',
      action: () => updateSettings({ variant: 'cosmic' }),
    },
    {
      id: 'settings-animations-toggle',
      title: 'Toggle Animations',
      description: 'Enable or disable UI animations',
      icon: Zap,
      keywords: ['animations', 'toggle', 'performance'],
      category: 'settings',
      action: () => updateSettings({ showAnimations: !user?.preferences?.showAnimations }),
    },

    // Search Commands
    {
      id: 'search-files',
      title: 'Search Files',
      description: 'Find files across all projects',
      icon: Search,
      keywords: ['search', 'files', 'find', 'documents'],
      category: 'search',
      action: () => navigate('/dashboard/files?search=true'),
      shortcut: 'Cmd+K',
    },
    {
      id: 'search-projects',
      title: 'Search Projects',
      description: 'Find specific projects',
      icon: Search,
      keywords: ['search', 'projects', 'find'],
      category: 'search',
      action: () => navigate('/dashboard/projects?search=true'),
      shortcut: 'Cmd+P',
    },
  ], [updateSettings, user?.preferences?.showAnimations]);

  // Filter commands based on query and permissions
  const filteredCommands = useMemo(() => {
    let filtered = commands.filter(command => {
      // Check authentication requirements
      if (command.requiresAuth && !user) return false;

      // Check permissions
      if (command.permissions && user && !command.permissions.includes(user.userType)) {
        return false;
      }

      // Filter by query
      if (!query.trim()) return true;

      const searchTerms = query.toLowerCase().split(' ');
      return searchTerms.every(term =>
        command.title.toLowerCase().includes(term) ||
        command.description?.toLowerCase().includes(term) ||
        command.keywords.some(keyword => keyword.toLowerCase().includes(term))
      );
    });

    // Add recent commands at the top if no query
    if (!query.trim() && recentCommands.length > 0) {
      const recentCommandObjects = recentCommands
        .map(id => commands.find(cmd => cmd.id === id))
        .filter(Boolean) as CommandAction[];

      // Remove recent commands from filtered list to avoid duplicates
      const nonRecentFiltered = filtered.filter(cmd => !recentCommands.includes(cmd.id));

      // Add recent section
      filtered = [
        ...recentCommandObjects.map(cmd => ({ ...cmd, category: 'recent' as const })),
        ...nonRecentFiltered
      ];
    }

    return filtered;
  }, [commands, query, user, recentCommands]);

  // Handle command execution
  const executeCommand = useCallback((command: CommandAction) => {
    command.action();
    saveRecentCommand(command.id);
    onClose();
    setQuery('');
  }, [saveRecentCommand, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? filteredCommands.length - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand, onClose]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return ArrowRight;
      case 'actions': return Zap;
      case 'settings': return Settings;
      case 'search': return Search;
      case 'recent': return Clock;
      default: return Hash;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-500/20 text-blue-400';
      case 'actions': return 'bg-green-500/20 text-green-400';
      case 'settings': return 'bg-purple-500/20 text-purple-400';
      case 'search': return 'bg-orange-500/20 text-orange-400';
      case 'recent': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-slate-900/95 backdrop-blur-md border-white/10">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Command className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 bg-transparent text-white placeholder-gray-400 focus:ring-0 text-lg"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No commands found</p>
              <p className="text-sm text-gray-500 mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredCommands.map((command, index) => {
                const IconComponent = command.icon;
                const CategoryIcon = getCategoryIcon(command.category);

                return (
                  <div
                    key={command.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      index === selectedIndex
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    )}
                    onClick={() => executeCommand(command)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <IconComponent className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium">{command.title}</div>
                        {command.description && (
                          <div className="text-sm text-gray-400">{command.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', getCategoryColor(command.category))}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {command.category}
                      </Badge>

                      {command.shortcut && (
                        <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                          {command.shortcut}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to close</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>{filteredCommands.length} commands</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}