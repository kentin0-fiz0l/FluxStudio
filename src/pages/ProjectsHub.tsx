/**
 * ProjectsHub - The Primary Landing Page (3-Zone Layout)
 *
 * This is where users land after login. Projects are the primary focus.
 *
 * Zone 1 (10%): Welcome hero - orientation, not action
 * Zone 2 (60%): Projects - the main job
 * Zone 3 (30%): Activity stream - context, collapsible
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import Fuse from 'fuse.js';
import { useDebouncedCallback } from 'use-debounce';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Folder,
  Users,
  Sparkles,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Star,
  X,
  CalendarDays,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/molecules';
import { SortableProjectCard } from '@/components/projects/SortableProjectCard';
import { ProjectCardSkeleton } from '@/components/loading/LoadingStates';
import { UniversalEmptyState, emptyStateConfigs } from '@/components/ui/UniversalEmptyState';
import { useProjects } from '@/hooks/project/useProjects';
import { useDashboardActivities } from '@/hooks/useActivities';
import { useAuth } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useFirstTimeExperience } from '@/hooks/useFirstTimeExperience';
import { ProductTour } from '@/components/onboarding/ProductTour';
import { UsageLimitNudge } from '@/components/UsageLimitNudge';
import { useWorkingContext } from '@/store';
import { ResumeCard } from '@/components/momentum/ResumeCard';
import { usePullToRefresh } from '@/hooks/ui/usePullToRefresh';
import { recommendationEngine, type RecommendationItem, type UserBehavior } from '@/services/recommendations/recommendationEngine';
import { BulkActionBar } from '@/components/BulkActionBar';
import { apiService } from '@/services/apiService';

type ViewMode = 'grid' | 'list';

export function ProjectsHub() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { projects, loading, fetchProjects } = useProjects();
  const { hasResumableContext } = useWorkingContext();

  // Recommendations
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const memberIds: string[] = [];
    for (const p of projects) {
      const members = (p as unknown as { members?: Array<{ id?: string; userId?: string }> }).members;
      if (members) {
        for (const m of members) {
          const id = m.id || m.userId;
          if (id) memberIds.push(id);
        }
      }
    }

    const behavior: UserBehavior = {
      recentViews: projects.slice(0, 5).map((p) => p.id),
      recentEdits: [],
      searchQueries: [],
      usedFeatures: [],
      collaborators: memberIds.slice(0, 10),
      preferences: {},
    };

    recommendationEngine
      .generateRecommendations(user.id, behavior, 5)
      .then((recs) => {
        if (!cancelled) setRecommendations(recs);
      })
      .catch(() => {
        // Silently ignore recommendation failures
      });

    return () => { cancelled = true; };
  }, [user?.id, projects]);

  // Pull-to-refresh for mobile
  const projectsContainerRef = useRef<HTMLDivElement>(null);
  const handlePullRefresh = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);
  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    containerRef: projectsContainerRef as React.RefObject<HTMLElement>,
  });
  const { data: activitiesData, isLoading: activitiesLoading } = useDashboardActivities({ limit: 10 });

  // First-time experience / product tour
  const firstTime = useFirstTimeExperience({
    projectCount: loading ? undefined : projects.length,
  });
  const [tourActive, setTourActive] = useState(false);

  // Activate tour once data is loaded and user qualifies
  useEffect(() => {
    const tourDone = localStorage.getItem('fx_product_tour_done_v1');
    if (!tourDone && firstTime.isFirstTime && !loading) {
      const timer = setTimeout(() => setTourActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [firstTime.isFirstTime, loading]);

  const handleTourComplete = useCallback(() => {
    setTourActive(false);
    localStorage.setItem('fx_product_tour_done_v1', 'true');
    firstTime.completeAll();
  }, [firstTime]);

  // View state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'oldest'>('recent');

  // Advanced filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Bulk selection state
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Debounced search
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  // Fuse.js instance for fuzzy search
  const fuse = useMemo(() => new Fuse(projects, {
    keys: ['name', 'description', 'tags'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [projects]);

  // Unique team members across all projects
  const allTeamMembers = useMemo(() => {
    const members = new Map<string, { id: string; name: string }>();
    for (const p of projects) {
      const mems = (p as unknown as { members?: Array<{ id?: string; userId?: string; name?: string }> }).members;
      if (mems) {
        for (const m of mems) {
          const id = m.id || m.userId;
          if (id && !members.has(id)) {
            members.set(id, { id, name: m.name || id });
          }
        }
      }
    }
    return Array.from(members.values());
  }, [projects]);

  const hasActiveFilters = statusFilter.length > 0 || teamFilter.length > 0 || dateRange.from || dateRange.to;

  const clearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setTeamFilter([]);
    setDateRange({});
  }, []);

  // Favorites persisted to localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('flux_favorite_projects');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleFavorite = useCallback((projectId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      localStorage.setItem('flux_favorite_projects', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Custom project order (persisted to localStorage)
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fx_project_order');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // DnD sensors (pointer with activation distance + keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCustomOrder((prev) => {
      // Build the current ID list from allFilteredProjects or prev
      const currentIds = allFilteredProjects.map((p) => p.id);
      const ordered = prev.length > 0
        ? prev.filter((id) => currentIds.includes(id)).concat(currentIds.filter((id) => !prev.includes(id)))
        : currentIds;

      const oldIndex = ordered.indexOf(active.id as string);
      const newIndex = ordered.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(ordered, oldIndex, newIndex);
      localStorage.setItem('fx_project_order', JSON.stringify(reordered));
      return reordered;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter projects based on search, apply sort, then split by favorites
  const { favoritedProjects, unfavoritedProjects, allFilteredProjects } = useMemo(() => {
    // Use Fuse.js for fuzzy search, fall back to full list when no search term
    let result = debouncedSearch
      ? fuse.search(debouncedSearch).map((r) => r.item)
      : projects;

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter((p) => statusFilter.includes(p.status));
    }

    // Apply team filter
    if (teamFilter.length > 0) {
      result = result.filter((p) => {
        const mems = (p as unknown as { members?: Array<{ id?: string; userId?: string }> }).members;
        if (!mems) return false;
        return mems.some((m) => teamFilter.includes(m.id || m.userId || ''));
      });
    }

    // Apply date range filter
    if (dateRange.from) {
      result = result.filter((p) => new Date(p.createdAt) >= dateRange.from!);
    }
    if (dateRange.to) {
      result = result.filter((p) => new Date(p.createdAt) <= dateRange.to!);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // 'recent' - default, by updatedAt desc
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Apply custom DnD order if available
    if (customOrder.length > 0) {
      const orderMap = new Map(customOrder.map((id, idx) => [id, idx]));
      result = [...result].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? Infinity;
        const bi = orderMap.get(b.id) ?? Infinity;
        return ai - bi;
      });
    }

    return {
      favoritedProjects: result.filter(p => favorites.has(p.id)),
      unfavoritedProjects: result.filter(p => !favorites.has(p.id)),
      allFilteredProjects: result,
    };
  }, [projects, debouncedSearch, fuse, customOrder, sortBy, favorites, statusFilter, teamFilter, dateRange]);

  // Current timestamp for deadline calculations (captured once on mount)
  const [now] = useState(() => Date.now());

  // Real activity data from API
  const recentActivity = useMemo(() => {
    if (!activitiesData?.activities) return [];
    return activitiesData.activities.map((activity) => ({
      id: activity.id,
      action: activity.description || `${activity.user?.name || 'Someone'} ${activity.action}`,
      project: activity.projectName || activity.entityTitle || 'Project',
      time: activity.timestamp
        ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
        : 'Recently',
      type: activity.type,
    }));
  }, [activitiesData]);

  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    debouncedSetSearch(query);
  };

  // Bulk action handlers
  const toggleProjectSelection = useCallback((projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProjects(new Set());
    setSelectionMode(false);
  }, []);

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedProjects);
    try {
      await apiService.patch('/projects/bulk', { action: 'archive', projectIds: ids });
      clearSelection();
      fetchProjects();
    } catch (err) {
      // Error handled by apiService
    }
  }, [selectedProjects, clearSelection, fetchProjects]);

  const handleBulkStatusChange = useCallback(async (status: string) => {
    const ids = Array.from(selectedProjects);
    try {
      await apiService.patch('/projects/bulk', { action: 'status_change', projectIds: ids, status });
      clearSelection();
      fetchProjects();
    } catch (err) {
      // Error handled by apiService
    }
  }, [selectedProjects, clearSelection, fetchProjects]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedProjects);
    try {
      await apiService.patch('/projects/bulk', { action: 'delete', projectIds: ids });
      clearSelection();
      fetchProjects();
    } catch (err) {
      // Error handled by apiService
    }
  }, [selectedProjects, clearSelection, fetchProjects]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Projects' }]}
      onLogout={logout}
      showSearch={false}
    >
      <div ref={projectsContainerRef} className="p-6 space-y-6">
        {/* Pull-to-refresh indicator (mobile only) */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden transition-all"
            style={{ height: refreshing ? 48 : pullDistance * 0.6 }}
          >
            <Loader2
              className={cn(
                'w-5 h-5 text-primary-600',
                refreshing && 'animate-spin'
              )}
              style={
                !refreshing
                  ? { transform: `rotate(${pullDistance * 3}deg)`, opacity: Math.min(pullDistance / 80, 1) }
                  : undefined
              }
            />
          </div>
        )}

        {/* ZONE 1: Welcome Hero (10%) - Compact, Welcoming */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {projects.length > 0
                ? `You have ${projects.length} active project${projects.length !== 1 ? 's' : ''}`
                : 'Create your first project to get started'}
            </p>
          </div>
          <Button onClick={handleCreateProject} className="gap-2" aria-label="Create new project" data-tour="create-project">
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Project
          </Button>
        </motion.div>

        {/* Resume Card — pick up where you left off */}
        {hasResumableContext && <ResumeCard compact className="mt-3" />}

        {/* Usage limit nudge — projects */}
        <UsageLimitNudge resource="projects" />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ZONE 2: Projects (60% on desktop, 100% on mobile) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
                <Input
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-10"
                  aria-label="Search projects"
                  type="search"
                />
              </div>
              <div
                className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1"
                role="group"
                aria-label="View mode"
              >
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8"
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8"
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'oldest')}
                className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
                aria-label="Sort projects"
              >
                <option value="recent">Recently updated</option>
                <option value="name">Name A-Z</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter.length === 1 ? statusFilter[0] : ''}
                onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
                className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>

              {/* Team Filter */}
              {allTeamMembers.length > 0 && (
                <select
                  value={teamFilter.length === 1 ? teamFilter[0] : ''}
                  onChange={(e) => setTeamFilter(e.target.value ? [e.target.value] : [])}
                  className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
                  aria-label="Filter by team member"
                >
                  <option value="">All members</option>
                  {allTeamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
                  aria-label="Start date"
                  placeholder="From"
                />
                <span className="text-neutral-400 text-sm">-</span>
                <input
                  type="date"
                  value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
                  aria-label="End date"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {statusFilter.map((s) => (
                  <Badge key={s} variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
                    {s.replace('_', ' ')}
                    <button onClick={() => setStatusFilter((prev) => prev.filter((v) => v !== s))} className="ml-1 hover:text-red-500" aria-label={`Remove ${s} filter`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {teamFilter.map((t) => {
                  const member = allTeamMembers.find((m) => m.id === t);
                  return (
                    <Badge key={t} variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
                      {member?.name || t}
                      <button onClick={() => setTeamFilter((prev) => prev.filter((v) => v !== t))} className="ml-1 hover:text-red-500" aria-label={`Remove team filter`}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                {dateRange.from && (
                  <Badge variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
                    <CalendarDays className="w-3 h-3" /> From {dateRange.from.toLocaleDateString()}
                    <button onClick={() => setDateRange((prev) => ({ ...prev, from: undefined }))} className="ml-1 hover:text-red-500" aria-label="Remove start date filter">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {dateRange.to && (
                  <Badge variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
                    <CalendarDays className="w-3 h-3" /> To {dateRange.to.toLocaleDateString()}
                    <button onClick={() => setDateRange((prev) => ({ ...prev, to: undefined }))} className="ml-1 hover:text-red-500" aria-label="Remove end date filter">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Projects Grid/List */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : 'space-y-3'
                  )}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : allFilteredProjects.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={allFilteredProjects.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <motion.div
                      key="projects"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {favoritedProjects.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            Favorites
                          </h2>
                          <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3')}>
                            {favoritedProjects.map((project, index) => (
                              <SortableProjectCard key={project.id} id={project.id}>
                                {selectionMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleProjectSelection(project.id); }}
                                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                                    aria-label={selectedProjects.has(project.id) ? 'Deselect project' : 'Select project'}
                                  >
                                    <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center', selectedProjects.has(project.id) ? 'bg-primary-600 border-primary-600 text-white' : 'border-neutral-300')}>
                                      {selectedProjects.has(project.id) && <span className="text-xs">&#10003;</span>}
                                    </div>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id); }}
                                  className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                                  aria-label="Remove from favorites"
                                >
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                </button>
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                >
                                  <ProjectCard
                                    project={{
                                      id: project.id,
                                      name: project.name,
                                      description: project.description || '',
                                      status: 'active',
                                      progress: project.progress || 0,
                                      dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
                                      teamSize: project.members?.length || 1,
                                      teamAvatars: [],
                                      tags: (project as unknown as Record<string, unknown>).tags as string[] || [],
                                    }}
                                    variant={viewMode === 'list' ? 'compact' : 'default'}
                                    showProgress
                                    showTeam
                                    showTags
                                    showActions
                                    onClick={() => selectionMode ? toggleProjectSelection(project.id) : navigate(`/projects/${project.id}`)}
                                    onView={() => navigate(`/projects/${project.id}`)}
                                  />
                                </motion.div>
                              </SortableProjectCard>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3')}>
                        {unfavoritedProjects.map((project, index) => (
                          <SortableProjectCard key={project.id} id={project.id}>
                            {selectionMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleProjectSelection(project.id); }}
                                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                                aria-label={selectedProjects.has(project.id) ? 'Deselect project' : 'Select project'}
                              >
                                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center', selectedProjects.has(project.id) ? 'bg-primary-600 border-primary-600 text-white' : 'border-neutral-300')}>
                                  {selectedProjects.has(project.id) && <span className="text-xs">&#10003;</span>}
                                </div>
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id); }}
                              className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                              aria-label="Add to favorites"
                            >
                              <Star className="w-4 h-4 text-neutral-400" />
                            </button>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <ProjectCard
                                project={{
                                  id: project.id,
                                  name: project.name,
                                  description: project.description || '',
                                  status: 'active',
                                  progress: project.progress || 0,
                                  dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
                                  teamSize: project.members?.length || 1,
                                  teamAvatars: [],
                                  tags: (project as unknown as Record<string, unknown>).tags as string[] || [],
                                }}
                                variant={viewMode === 'list' ? 'compact' : 'default'}
                                showProgress
                                showTeam
                                showTags
                                showActions
                                onClick={() => selectionMode ? toggleProjectSelection(project.id) : navigate(`/projects/${project.id}`)}
                                onView={() => navigate(`/projects/${project.id}`)}
                              />
                            </motion.div>
                          </SortableProjectCard>
                        ))}
                      </div>
                    </motion.div>
                  </SortableContext>
                </DndContext>
              ) : searchTerm ? (
                <Card>
                  <CardContent className="p-0">
                    <UniversalEmptyState
                      icon={Search}
                      title="No projects found"
                      description={`No projects match "${searchTerm}". Try a different search.`}
                      illustration="search"
                      primaryAction={{
                        label: 'Clear Search',
                        onClick: () => setSearchTerm(''),
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <UniversalEmptyState
                      icon={Folder}
                      {...emptyStateConfigs.projects}
                      primaryAction={{
                        label: 'Create Project',
                        icon: <Plus className="w-4 h-4" aria-hidden="true" />,
                        onClick: handleCreateProject,
                      }}
                      secondaryAction={{
                        label: 'Browse Templates',
                        onClick: () => navigate('/projects/new?templates=true'),
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>
          </div>

          {/* ZONE 3: Activity Stream (30% - Collapsible on mobile) */}
          <div className="space-y-4">
            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    Suggested for you
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {recommendations.map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => {
                          if (rec.type === 'project') navigate('/projects');
                          else if (rec.type === 'file') navigate('/files');
                          else if (rec.type === 'feature') navigate('/tools');
                          else navigate('/projects');
                        }}
                        className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Badge
                            variant={rec.priority === 'high' ? 'warning' : 'default'}
                            size="sm"
                            className="mt-0.5 flex-shrink-0"
                          >
                            {rec.type}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {rec.title}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Card */}
            <Card>
              <CardHeader className="pb-3">
                <button
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="flex items-center justify-between w-full"
                  aria-expanded={activityExpanded}
                  aria-controls="activity-content"
                >
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Recent Activity
                  </CardTitle>
                  <div className="lg:hidden" aria-hidden="true">
                    {activityExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                    )}
                  </div>
                </button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {(activityExpanded || window.innerWidth >= 1024) && (
                  <motion.div
                    id="activity-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden lg:!h-auto lg:!opacity-100"
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {activitiesLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="w-2 h-2 rounded-full mt-1.5 bg-neutral-200 dark:bg-neutral-700" />
                                <div className="flex-1 space-y-1">
                                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : recentActivity.length > 0 ? (
                          recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start gap-3 text-sm"
                            >
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                  activity.type === 'file' && 'bg-blue-500',
                                  activity.type === 'comment' && 'bg-green-500',
                                  activity.type === 'member' && 'bg-purple-500',
                                  activity.type === 'task' && 'bg-amber-500',
                                  activity.type === 'project' && 'bg-indigo-500',
                                  activity.type === 'formation' && 'bg-pink-500',
                                  activity.type === 'message' && 'bg-cyan-500',
                                  !['file', 'comment', 'member', 'task', 'project', 'formation', 'message'].includes(activity.type) && 'bg-neutral-400'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-neutral-900 dark:text-white">
                                  {activity.action}
                                </p>
                                <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                                  {activity.project} · {activity.time}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-neutral-500 text-center py-4">
                            No recent activity yet. Start creating projects to see updates here!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-secondary-600" aria-hidden="true" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <nav className="space-y-2" aria-label="Quick actions">
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={handleCreateProject}
                  >
                    <Plus className="w-4 h-4 mr-3 text-primary-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">New Project</p>
                      <p className="text-xs text-neutral-500">
                        Start from scratch or template
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare className="w-4 h-4 mr-3 text-green-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">Messages</p>
                      <p className="text-xs text-neutral-500">
                        Chat with your team
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={() => navigate('/organization')}
                  >
                    <Users className="w-4 h-4 mr-3 text-purple-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">Team & Organization</p>
                      <p className="text-xs text-neutral-500">
                        Manage members and settings
                      </p>
                    </div>
                  </Button>
                </nav>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            {projects.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4 text-warning-600" aria-hidden="true" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {projects
                      .filter((p) => p.dueDate)
                      .sort(
                        (a, b) =>
                          new Date(a.dueDate!).getTime() -
                          new Date(b.dueDate!).getTime()
                      )
                      .slice(0, 3)
                      .map((project) => {
                        const dueDate = new Date(project.dueDate!);
                        const daysUntil = Math.ceil(
                          (dueDate.getTime() - now) / (1000 * 60 * 60 * 24)
                        );
                        const isOverdue = daysUntil < 0;
                        const isUrgent = daysUntil <= 7 && daysUntil >= 0;

                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                {project.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {dueDate.toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant={
                                isOverdue
                                  ? 'destructive'
                                  : isUrgent
                                  ? 'warning'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {isOverdue
                                ? 'Overdue'
                                : daysUntil === 0
                                ? 'Today'
                                : `${daysUntil} days`}
                            </Badge>
                          </div>
                        );
                      })}
                    {projects.filter((p) => p.dueDate).length === 0 && (
                      <p className="text-sm text-neutral-500 text-center py-2">
                        No upcoming deadlines
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedProjects.size}
        onClear={clearSelection}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onStatusChange={handleBulkStatusChange}
      />

      {/* Product Tour — first-run experience */}
      <ProductTour isActive={tourActive} onComplete={handleTourComplete} />
    </DashboardLayout>
  );
}

export default ProjectsHub;
