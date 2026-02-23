import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type Fuse from 'fuse.js';
import { useAuth } from '../../contexts/AuthContext';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { useProjectsData, useActivityData } from '../../hooks/useRealTimeData';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  Search,
  Command,
  Hash,
  FolderOpen,
  Settings,
  Palette,
  FileText,
  MessageSquare,
  Activity,
  Zap,
  Building2,
  User,
  BarChart3,
  Plus,
  Target,
  ChevronRight,
  X,
  Clock,
  Trash2,
} from 'lucide-react';
import { searchService } from '../../services/searchService';

interface SearchableItem {
  id: string;
  title: string;
  description?: string;
  category: 'navigation' | 'project' | 'user' | 'organization' | 'action' | 'file' | 'activity';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  priority?: number;
  badge?: string;
  metadata?: Record<string, any>;
}

interface CommandPaletteProps {
  className?: string;
}

export function CommandPalette({ className: _className }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOpen, close } = useCommandPalette();
  const { data: projects } = useProjectsData();
  const { data: activities } = useActivityData();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent searches when palette opens
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(searchService.getSearchHistory().slice(0, 5));
    }
  }, [isOpen]);

  // Build searchable items
  const searchableItems = useMemo((): SearchableItem[] => {
    const items: SearchableItem[] = [];

    // Navigation items
    const navigationItems: SearchableItem[] = [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        description: 'Go to unified dashboard',
        category: 'navigation',
        icon: BarChart3,
        action: () => navigate('/dashboard'),
        keywords: ['home', 'main', 'overview'],
        priority: 10,
      },
      {
        id: 'nav-projects',
        title: 'Projects',
        description: 'View all projects',
        category: 'navigation',
        icon: FolderOpen,
        action: () => navigate('/dashboard/projects'),
        keywords: ['work', 'tasks'],
        priority: 9,
      },
      {
        id: 'nav-organizations',
        title: 'Organizations',
        description: 'Manage organizations',
        category: 'navigation',
        icon: Building2,
        action: () => navigate('/dashboard/organizations'),
        keywords: ['company', 'team'],
        priority: 8,
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        description: 'Account and preferences',
        category: 'navigation',
        icon: Settings,
        action: () => navigate('/dashboard/settings'),
        keywords: ['config', 'preferences', 'account'],
        priority: 7,
      },
    ];

    // User-specific navigation
    if (user) {
      switch (user.userType) {
        case 'designer':
          navigationItems.push({
            id: 'nav-designer',
            title: 'Designer Dashboard',
            description: 'Creative workspace',
            category: 'navigation',
            icon: Palette,
            action: () => navigate('/dashboard/designer'),
            keywords: ['creative', 'design', 'workspace'],
            priority: 9,
          });
          break;
        case 'admin':
          navigationItems.push({
            id: 'nav-admin',
            title: 'Admin Dashboard',
            description: 'System administration',
            category: 'navigation',
            icon: Settings,
            action: () => navigate('/dashboard/admin'),
            keywords: ['administration', 'system', 'management'],
            priority: 9,
          });
          break;
        case 'client':
          navigationItems.push({
            id: 'nav-client',
            title: 'Client Dashboard',
            description: 'Project overview',
            category: 'navigation',
            icon: User,
            action: () => navigate('/dashboard/client'),
            keywords: ['client', 'overview'],
            priority: 9,
          });
          break;
      }
    }

    items.push(...navigationItems);

    // Action items
    const actionItems: SearchableItem[] = [
      {
        id: 'action-new-project',
        title: 'New Project',
        description: 'Create a new project',
        category: 'action',
        icon: Plus,
        action: () => {
          navigate('/dashboard/projects/create');
        },
        keywords: ['create', 'add', 'start'],
        priority: 8,
        badge: 'Action',
      },
      {
        id: 'action-search-files',
        title: 'Search Files',
        description: 'Find files across all projects',
        category: 'action',
        icon: Search,
        action: () => {
          // Open file search modal
        },
        keywords: ['files', 'documents', 'assets'],
        priority: 6,
        badge: 'Search',
      },
      {
        id: 'action-quick-message',
        title: 'Quick Message',
        description: 'Send a message to team',
        category: 'action',
        icon: MessageSquare,
        action: () => {
          // Messages now available via sidepanel only
        },
        keywords: ['message', 'chat', 'communicate'],
        priority: 5,
        badge: 'Action',
      },
    ];

    items.push(...actionItems);

    // Project items
    if (projects && Array.isArray(projects)) {
      const projectItems = projects.map((project): SearchableItem => ({
        id: `project-${project.id}`,
        title: project.name,
        description: `${project.status} • ${project.progress}% complete`,
        category: 'project',
        icon: FolderOpen,
        action: () => navigate(`/dashboard/projects/${project.id}`),
        keywords: [project.team, project.status, 'project'],
        priority: 6,
        badge: project.priority,
        metadata: project,
      }));
      items.push(...projectItems);
    }

    // Recent activity items
    if (activities && Array.isArray(activities)) {
      const activityItems = activities.slice(0, 5).map((activity): SearchableItem => ({
        id: `activity-${activity.id}`,
        title: activity.title,
        description: `By ${activity.user} • ${activity.description}`,
        category: 'activity',
        icon: Activity,
        action: () => {
          // Navigate to related item based on activity type
        },
        keywords: [activity.user, activity.type.replace('_', ' ')],
        priority: 3,
        badge: activity.type.replace('_', ' '),
        metadata: activity,
      }));
      items.push(...activityItems);
    }

    return items;
  }, [user, projects, activities, navigate]);

  // Lazily loaded Fuse instance
  const fuseRef = useRef<Fuse<SearchableItem> | null>(null);
  const itemsRef = useRef(searchableItems);
  itemsRef.current = searchableItems;

  const fuseOptions = useMemo(() => ({
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'keywords', weight: 0.2 },
      { name: 'category', weight: 0.1 },
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
  }), []);

  const loadFuse = useCallback(async () => {
    if (fuseRef.current) return fuseRef.current;
    const FuseModule = await import('fuse.js');
    fuseRef.current = new FuseModule.default(itemsRef.current, fuseOptions);
    return fuseRef.current;
  }, [fuseOptions]);

  // Rebuild Fuse index when items change (only if already loaded)
  useEffect(() => {
    if (fuseRef.current) {
      import('fuse.js').then(FuseModule => {
        fuseRef.current = new FuseModule.default(searchableItems, fuseOptions);
      });
    }
  }, [searchableItems, fuseOptions]);

  // Filter and sort results
  const defaultResults = useMemo(() => {
    return searchableItems
      .filter(item => (item.priority || 0) >= 5)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 8);
  }, [searchableItems]);

  const [results, setResults] = useState<SearchableItem[]>(defaultResults);

  useEffect(() => {
    if (!query.trim()) {
      setResults(defaultResults);
      return;
    }
    let cancelled = false;
    loadFuse().then(fuse => {
      if (cancelled) return;
      const fuseResults = fuse.search(query);
      setResults(fuseResults.map(r => r.item).slice(0, 10));
    });
    return () => { cancelled = true; };
  }, [query, defaultResults, loadFuse]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = results.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, SearchableItem[]>);

    return Object.entries(groups).sort(([a], [b]) => {
      const order = ['navigation', 'action', 'project', 'activity', 'user', 'organization', 'file'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (!query.trim() && recentSearches[selectedIndex]) {
            // Select a recent search to fill in the query
            setQuery(recentSearches[selectedIndex]);
            break;
          }
          if (results[selectedIndex]) {
            if (query.trim()) {
              searchService.getSearchHistory(); // ensure loaded
              // The search service addToHistory is called during search()
              // but since we're using Fuse locally, manually record
              const history = searchService.getSearchHistory();
              if (!history.includes(query.trim())) {
                searchService.search({ query: query.trim(), limit: 0 }).catch(() => {});
              }
            }
            results[selectedIndex].action();
            close();
            setQuery('');
            setSelectedIndex(0);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          setQuery('');
          setSelectedIndex(0);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, close]);

  // Reset selection when results change
  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return Hash;
      case 'project': return FolderOpen;
      case 'action': return Zap;
      case 'user': return User;
      case 'organization': return Building2;
      case 'file': return FileText;
      case 'activity': return Activity;
      default: return Target;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'action': return 'bg-blue-500/20 text-blue-400';
      case 'search': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -50 }}
          transition={{ duration: 0.2 }}
          className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="backdrop-blur-md bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <Command className="h-5 w-5 text-white/70" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, files, actions..."
                className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 text-lg"
              />
              <Badge className="bg-white/10 text-white/70 border-white/20 text-xs">
                ⌘K
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={close}
                className="p-1 h-auto text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-96 overflow-y-auto" role="listbox" aria-label="Search results">
              {groupedResults.length > 0 ? (
                <div className="p-2">
                  {groupedResults.map(([category, items], categoryIndex) => {
                    const CategoryIcon = getCategoryIcon(category);
                    let currentIndex = 0;

                    // Calculate the starting index for this category
                    for (let i = 0; i < categoryIndex; i++) {
                      currentIndex += groupedResults[i][1].length;
                    }

                    return (
                      <div key={category} className="mb-4 last:mb-0">
                        {/* Category Header */}
                        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                          <CategoryIcon className="h-3 w-3" />
                          {getCategoryLabel(category)}
                        </div>

                        {/* Items */}
                        <div className="space-y-1">
                          {items.map((item, itemIndex) => {
                            const globalIndex = currentIndex + itemIndex;
                            const isSelected = globalIndex === selectedIndex;
                            const ItemIcon = item.icon;

                            return (
                              <motion.div
                                key={item.id}
                                layout
                                className={cn(
                                  'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors group',
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                )}
                                onClick={() => {
                                  if (query.trim()) {
                                    searchService.search({ query: query.trim(), limit: 0 }).catch(() => {});
                                  }
                                  item.action();
                                  close();
                                  setQuery('');
                                  setSelectedIndex(0);
                                }}
                              >
                                <div className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white'
                                )}>
                                  <ItemIcon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium truncate">{item.title}</h4>
                                    {item.badge && (
                                      <Badge className={`text-xs ${getBadgeColor(item.badge)}`}>
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-400 truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                <ChevronRight className={cn(
                                  'h-4 w-4 transition-opacity',
                                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                )} />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-8 w-8 text-gray-500 mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
                  <p className="text-gray-400 text-sm">
                    Try searching for projects, files, or actions
                  </p>
                </div>
              ) : recentSearches.length > 0 ? (
                <div className="p-2">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </div>
                    <button
                      onClick={() => {
                        searchService.clearSearchHistory();
                        setRecentSearches([]);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((term, index) => (
                      <div
                        key={term}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group',
                          index === selectedIndex
                            ? 'bg-white/20 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                        onClick={() => {
                          setQuery(term);
                        }}
                      >
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate">{term}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            searchService.removeFromHistory(term);
                            setRecentSearches(prev => prev.filter(t => t !== term));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Command className="h-8 w-8 text-gray-500 mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>
                  <p className="text-gray-400 text-sm">
                    Start typing to search across your workspace
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Esc</kbd>
                  Close
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}