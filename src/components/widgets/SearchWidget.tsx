import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { useProjectsData, useActivityData } from '../../hooks/useRealTimeData';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { WidgetProps } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import {
  Search,
  Command,
  FolderOpen,
  Activity,
  Settings,
  Building2,
  Users,
  FileText,
  Zap,
  ArrowRight,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  X,
} from 'lucide-react';

interface QuickSearchResult {
  id: string;
  title: string;
  description: string;
  category: 'project' | 'activity' | 'navigation' | 'action';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
}

export function SearchWidget(props: WidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open: openCommandPalette } = useCommandPalette();
  const { data: projects } = useProjectsData();
  const { data: activities } = useActivityData();

  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Build quick search data
  const searchData = useMemo((): QuickSearchResult[] => {
    const results: QuickSearchResult[] = [];

    // Recent projects
    if (projects && Array.isArray(projects)) {
      const recentProjects = projects.slice(0, 3).map(project => ({
        id: `project-${project.id}`,
        title: project.name,
        description: `${project.status} • ${project.progress}% complete`,
        category: 'project' as const,
        icon: FolderOpen,
        action: () => navigate(`/dashboard/projects/${project.id}`),
        badge: project.priority,
      }));
      results.push(...recentProjects);
    }

    // Recent activities
    if (activities && Array.isArray(activities)) {
      const recentActivities = activities.slice(0, 2).map(activity => ({
        id: `activity-${activity.id}`,
        title: activity.title,
        description: `By ${activity.user}`,
        category: 'activity' as const,
        icon: Activity,
        action: () => console.log('Navigate to activity', activity),
        badge: 'recent',
      }));
      results.push(...recentActivities);
    }

    // Common actions
    const commonActions: QuickSearchResult[] = [
      {
        id: 'action-new-project',
        title: 'New Project',
        description: 'Create a new project',
        category: 'action',
        icon: Plus,
        action: () => navigate('/dashboard/projects/create'),
      },
      {
        id: 'nav-organizations',
        title: 'Organizations',
        description: 'Manage organizations',
        category: 'navigation',
        icon: Building2,
        action: () => navigate('/dashboard/organizations'),
      },
    ];

    results.push(...commonActions);
    return results;
  }, [projects, activities, navigate]);

  // Set up fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(searchData, {
      keys: ['title', 'description'],
      threshold: 0.4,
    });
  }, [searchData]);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return searchData.slice(0, 4);
    }

    const results = fuse.search(query);
    return results.map(result => result.item).slice(0, 4);
  }, [query, searchData, fuse]);

  // Auto-expand when typing
  useEffect(() => {
    if (query.trim()) {
      setIsExpanded(true);
    }
  }, [query]);

  const handleClearSearch = () => {
    setQuery('');
    setIsExpanded(false);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge?.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'recent': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return FolderOpen;
      case 'activity': return Activity;
      case 'navigation': return Settings;
      case 'action': return Zap;
      default: return FileText;
    }
  };

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Quick Search',
        description: 'Find projects, files, and actions quickly',
      }}
      headerAction={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={openCommandPalette}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <Command className="h-3 w-3 mr-1" />
            ⌘K
          </Button>
          <Search className="h-4 w-4 text-blue-400" />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, actions..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:bg-white/20"
            onFocus={() => setIsExpanded(true)}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Quick Actions (when not searching) */}
        {!query.trim() && !isExpanded && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/projects')}
              className="justify-start text-white hover:bg-white/10 p-3 h-auto"
            >
              <FolderOpen className="h-4 w-4 mr-2 text-purple-400" />
              <span className="text-sm">Projects</span>
            </Button>
            <Button
              variant="ghost"
              onClick={openCommandPalette}
              className="justify-start text-white hover:bg-white/10 p-3 h-auto"
            >
              <Command className="h-4 w-4 mr-2 text-blue-400" />
              <span className="text-sm">Commands</span>
            </Button>
          </div>
        )}

        {/* Search Results */}
        <AnimatePresence>
          {(query.trim() || isExpanded) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredResults.length > 0 ? (
                filteredResults.map((result, index) => {
                  const ItemIcon = result.icon;
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
                      onClick={() => {
                        result.action();
                        handleClearSearch();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white transition-colors">
                          <ItemIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white text-sm truncate">
                              {result.title}
                            </h4>
                            {result.badge && (
                              <Badge className={`text-xs ${getBadgeColor(result.badge)}`}>
                                {result.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs truncate">
                            {result.description}
                          </p>
                        </div>

                        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <Search className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No results found</p>
                  <p className="text-gray-500 text-xs">Try different keywords</p>
                </div>
              )}

              {/* Advanced Search Link */}
              <div className="pt-2 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={openCommandPalette}
                  className="w-full justify-between text-white/70 hover:text-white hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Command className="h-4 w-4" />
                    Advanced Search
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        {!query.trim() && !isExpanded && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <div className="text-center p-2">
              <p className="text-lg font-bold text-white">
                {projects ? projects.length : 0}
              </p>
              <p className="text-xs text-gray-400">Projects</p>
            </div>
            <div className="text-center p-2">
              <p className="text-lg font-bold text-white">
                {activities ? activities.length : 0}
              </p>
              <p className="text-xs text-gray-400">Activities</p>
            </div>
            <div className="text-center p-2">
              <p className="text-lg font-bold text-white">
                {user ? 1 : 0}
              </p>
              <p className="text-xs text-gray-400">User</p>
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}