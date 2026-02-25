import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { ProjectCard } from '../components/molecules';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, EmptyState } from '../components/ui';
import { ProjectCardSkeleton } from '../components/loading/LoadingStates';
import { Logo3D } from '../components/Logo3D';
import { GettingStartedCard } from '../components/common/GettingStartedCard';
import { useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { useProjects } from '../hooks/useProjects';
import {
  Briefcase,
  Folder,
  Users as UsersIcon,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

import { useAuth } from '@/store/slices/authSlice';
import { DailyBriefWidget } from '../components/agent/DailyBriefWidget';
import { PushPermissionPrompt } from '../components/notifications/PushPermissionPrompt';

export function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);
  const [_searchTerm, setSearchTerm] = useState('');

  // Get real project data for first-time detection
  const { projects, loading: projectsLoading } = useProjects();

  // First-time experience hook
  const {
    isFirstTime,
    isDismissed,
    steps,
    markStepComplete,
    dismiss,
    completedCount,
    totalSteps,
    updateData,
  } = useFirstTimeExperience();

  // Update first-time experience data when projects load
  useEffect(() => {
    if (!projectsLoading) {
      updateData({ projectCount: projects.length });
    }
  }, [projects.length, projectsLoading, updateData]);

  // Use real projects if available, otherwise show mock data for demo
  const recentProjects = projects.length > 0 ? projects.slice(0, 3).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    status: 'active' as const,
    progress: p.progress || 0,
    dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
    teamSize: p.members?.length || 1,
    teamAvatars: [],
    tags: (p as unknown as Record<string, unknown>).tags as string[] || []
  })) : [
    {
      id: '1',
      name: 'Summer Show 2024',
      description: 'Complete production design and technical planning for summer showcase',
      status: 'active' as const,
      progress: 65,
      dueDate: new Date('2025-02-15'),
      teamSize: 8,
      teamAvatars: [],
      tags: ['Design', 'Production']
    },
    {
      id: '2',
      name: 'Website Redesign',
      description: 'Modern rebrand with new visual identity and user experience',
      status: 'active' as const,
      progress: 40,
      dueDate: new Date('2025-03-01'),
      teamSize: 5,
      teamAvatars: [],
      tags: ['Web', 'UX']
    },
    {
      id: '3',
      name: 'Marketing Campaign',
      description: 'Q1 digital marketing campaign across all platforms',
      status: 'active' as const,
      progress: 85,
      dueDate: new Date('2025-01-30'),
      teamSize: 4,
      teamAvatars: [],
      tags: ['Marketing']
    }
  ];

  const recentActivity = [
    { action: 'Project "Summer Show 2024" updated', time: '2 hours ago', type: 'project' as const },
    { action: 'New message from Design Team', time: '4 hours ago', type: 'message' as const },
    { action: 'Files uploaded to "Props & Scenic"', time: '1 day ago', type: 'file' as const }
  ];

  const quickStats = [
    { label: 'Active Projects', value: '3', icon: <Briefcase className="w-5 h-5" aria-hidden="true" />, color: 'primary' as const },
    { label: 'Team Members', value: '12', icon: <UsersIcon className="w-5 h-5" aria-hidden="true" />, color: 'success' as const },
    { label: 'Files Shared', value: '48', icon: <Folder className="w-5 h-5" aria-hidden="true" />, color: 'secondary' as const }
  ];

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    // Navigate to search results page or filter content
    navigate(`/projects?search=${encodeURIComponent(query)}`);
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Dashboard' }]}
      onSearch={handleSearch}
      onLogout={logout}
      showSearch
    >
      <div className="p-6 space-y-6">
        {/* Welcome Hero Section */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-2xl p-8 text-white shadow-xl border border-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 drop-shadow-lg">
                <Sparkles className="w-8 h-8" aria-hidden="true" />
                Welcome back{user ? `, ${user.name}` : ''}!
              </h1>
              <p className="text-white text-lg drop-shadow-md">
                Your creative studio for managing projects, collaborating with teams, and bringing ideas to life.
              </p>
            </div>
            <div className="hidden lg:block">
              <Logo3D variant="dark" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              interactive
              className="cursor-pointer"
              onClick={() => navigate('/projects/new')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Start New Project</h3>
                    <p className="text-sm text-neutral-600">Begin a new creative project</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 ml-auto" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            <Card
              interactive
              className="cursor-pointer"
              onClick={() => navigate('/tools/files')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                    <Folder className="w-6 h-6 text-success-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Browse Files</h3>
                    <p className="text-sm text-neutral-600">Access your design files</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 ml-auto" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            <Card
              interactive
              className="cursor-pointer"
              onClick={() => navigate('/team')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-secondary-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Team Collaboration</h3>
                    <p className="text-sm text-neutral-600">Connect with your team</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 ml-auto" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index} variant="outline">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">Recent Projects</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                icon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                View All
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {projectsLoading ? (
                // Show skeleton loaders while loading
                <>
                  <ProjectCardSkeleton />
                  <ProjectCardSkeleton />
                  <ProjectCardSkeleton />
                </>
              ) : recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="compact"
                    showProgress
                    showTeam
                    showTags
                    onView={() => navigate(`/projects/${project.id}`)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Briefcase className="w-8 h-8" aria-hidden="true" />}
                      title="No projects yet"
                      description="Create your first project to start collaborating with your team"
                      action={
                        <Button onClick={() => navigate('/projects/new')}>
                          <Briefcase className="w-4 h-4 mr-2" aria-hidden="true" />
                          Create Project
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* First-Time Onboarding Card */}
            {(isFirstTime || (!isDismissed && completedCount < totalSteps)) && (
              <GettingStartedCard
                steps={steps}
                completedCount={completedCount}
                totalSteps={totalSteps}
                onDismiss={dismiss}
                onStepComplete={markStepComplete}
              />
            )}

            {/* Push Notification Permission Prompt */}
            <PushPermissionPrompt />

            {/* AI Daily Brief */}
            <DailyBriefWidget />

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-warning-600" aria-hidden="true" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-neutral-200 last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        activity.type === 'project' ? 'bg-primary-600' :
                        activity.type === 'message' ? 'bg-success-600' : 'bg-secondary-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-900">{activity.action}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links (shown when onboarding is dismissed) */}
            {isDismissed && (
              <Card variant="outline">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-600" aria-hidden="true" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link
                      to="/projects"
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                      View all projects
                    </Link>
                    <Link
                      to="/messages"
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                      Messages
                    </Link>
                    <Link
                      to="/tools/metmap"
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                      Open MetMap
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Deadlines */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning-600" aria-hidden="true" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Marketing Campaign</p>
                      <p className="text-xs text-neutral-600">Jan 30, 2025</p>
                    </div>
                    <Badge variant="warning" size="sm">5 days</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Summer Show 2024</p>
                      <p className="text-xs text-neutral-600">Feb 15, 2025</p>
                    </div>
                    <Badge variant="default" size="sm">21 days</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Website Redesign</p>
                      <p className="text-xs text-neutral-600">Mar 1, 2025</p>
                    </div>
                    <Badge variant="default" size="sm">35 days</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default Home;
