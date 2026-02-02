/**
 * Tools Page - Flux Design Language
 *
 * Internal hub for external tools and applications.
 * Uses DashboardLayout for consistent FluxStudio experience.
 */

import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Card, Button, Badge } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useMetMap } from '../contexts/MetMapContext';
import { useActiveProjectOptional } from '../contexts/ActiveProjectContext';
import {
  ExternalLink,
  ArrowRight,
  Wrench,
  Sparkles,
  Star,
  Palette,
  FolderOpen,
  BarChart3,
  Music,
  FileBox,
  Package,
  Target,
  MessageSquare,
  CheckSquare,
  PenTool,
  Layers,
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'coming_soon';
  category: string;
  url?: string;
  internalPath?: string;
}

const tools: Tool[] = [
  {
    id: 'metmap',
    name: 'MetMap',
    description: 'Rehearse tempo changes, meter shifts, and map chord progressions for practice. Perfect for complex pieces.',
    icon: <Music className="w-8 h-8" />,
    status: 'active',
    category: 'Music Production',
    internalPath: '/tools/metmap',
  },
  {
    id: 'files',
    name: 'Files',
    description: 'Upload references, drafts, audio, or exports. Files stay connected to your project conversations.',
    icon: <FileBox className="w-8 h-8" />,
    status: 'active',
    category: 'File Management',
    internalPath: '/tools/files',
  },
  {
    id: 'assets',
    name: 'Assets',
    description: 'Create reusable, tagged, versioned creative elements to share across your projects.',
    icon: <Package className="w-8 h-8" />,
    status: 'active',
    category: 'Asset Management',
    internalPath: '/tools/assets',
  },
];

const comingSoonTools: Tool[] = [
  {
    id: 'ai-design',
    name: 'AI Design Assistant',
    description: 'Intelligent design suggestions and automation',
    icon: <Sparkles className="w-8 h-8" />,
    status: 'coming_soon',
    category: 'Design',
  },
  {
    id: 'asset-library',
    name: 'Asset Library',
    description: 'Centralized asset management and organization',
    icon: <FolderOpen className="w-8 h-8" />,
    status: 'coming_soon',
    category: 'Resources',
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Project insights and performance metrics',
    icon: <BarChart3 className="w-8 h-8" />,
    status: 'coming_soon',
    category: 'Analytics',
  },
];

function Tools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { stats, loadStats } = useMetMap();
  const activeProjectContext = useActiveProjectOptional();
  const activeProject = activeProjectContext?.activeProject ?? null;
  const hasFocus = activeProjectContext?.hasFocus ?? false;

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      console.log('User not authenticated, redirecting to login...');
      navigate('/login', { replace: true });
      return;
    }

    document.title = 'Tools - FluxStudio';
    loadStats();
  }, [user, navigate, loadStats]);

  const handleLaunchTool = (tool: Tool) => {
    if (tool.internalPath) {
      navigate(tool.internalPath);
    } else if (tool.url) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Tools' }]}
      onLogout={logout}
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Header with project-first framing */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-primary-600" aria-hidden="true" />
            Tools
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Specialized tools that enhance your creative workflow — organize your work inside projects.
          </p>
          {/* Project bridge */}
          <Link
            to="/projects"
            className="inline-block text-sm text-primary-600 hover:text-primary-700 mt-2"
          >
            ← Back to Projects
          </Link>
        </div>

        {/* Project Quick Actions - shows when a project is focused */}
        {hasFocus && activeProject && (
          <Card className="bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                Quick Actions for {activeProject.name}
              </h2>
              <Badge variant="info" size="sm">Focused</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}`)}
                className="bg-white dark:bg-neutral-900"
              >
                <FolderOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Overview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}?tab=tasks`)}
                className="bg-white dark:bg-neutral-900"
              >
                <CheckSquare className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Tasks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}?tab=messages`)}
                className="bg-white dark:bg-neutral-900"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Messages
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}?tab=files`)}
                className="bg-white dark:bg-neutral-900"
              >
                <FileBox className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}?tab=assets`)}
                className="bg-white dark:bg-neutral-900"
              >
                <Layers className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Assets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}?tab=boards`)}
                className="bg-white dark:bg-neutral-900"
              >
                <PenTool className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Boards
              </Button>
            </div>
          </Card>
        )}

        {/* Featured Tools Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Featured Tools
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Card
                key={tool.id}
                className={`relative group bg-white dark:bg-neutral-800 rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  tool.id === 'metmap'
                    ? 'border-primary-300 dark:border-primary-600 ring-1 ring-primary-200 dark:ring-primary-700'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
                onClick={() => handleLaunchTool(tool)}
              >
                {/* Badge - Featured for MetMap, NEW for others */}
                <div className={`absolute -top-2 -right-2 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg ${
                  tool.id === 'metmap'
                    ? 'bg-gradient-to-r from-primary-600 to-indigo-600'
                    : 'bg-primary-600'
                }`}>
                  {tool.id === 'metmap' ? 'FEATURED' : 'NEW'}
                </div>

                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-indigo-900/30 rounded-xl mb-4">
                  <div className="text-primary-600 dark:text-primary-400">
                    {tool.icon}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  {tool.name}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                  {tool.description}
                </p>

                {/* MetMap Stats */}
                {tool.id === 'metmap' && stats && (
                  <div className="flex gap-3 text-xs text-neutral-500 mb-3">
                    <span>{stats.songCount} songs</span>
                    <span>{stats.practiceCount} sessions</span>
                  </div>
                )}

                {/* Category & Action */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">
                    {tool.category}
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchTool(tool);
                    }}
                    className="shadow-sm"
                  >
                    {tool.internalPath ? (
                      <>
                        <ArrowRight className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        Open
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        Launch
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Coming Soon
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonTools.map((tool) => (
              <div
                key={tool.id}
                className="relative bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 opacity-60 cursor-not-allowed"
              >
                {/* Coming Soon Badge */}
                <div className="absolute -top-2 -right-2 bg-neutral-400 dark:bg-neutral-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  Soon
                </div>

                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-xl mb-4">
                  <div className="text-neutral-400 dark:text-neutral-500">
                    {tool.icon}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {tool.name}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
                  {tool.description}
                </p>

                {/* Category */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600 font-medium">
                    {tool.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-primary-200 dark:border-primary-800 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">
                Have a tool suggestion?
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                We're constantly expanding our toolkit. If you have ideas for tools that would
                enhance your creative workflow, we'd love to hear from you.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default Tools;
