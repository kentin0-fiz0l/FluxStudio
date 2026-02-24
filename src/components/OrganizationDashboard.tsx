import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '@/store/slices/authSlice';
import { MobileOptimizedHeader } from './MobileOptimizedHeader';
import { OrganizationBreadcrumb } from './OrganizationBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Building2,
  Users,
  FolderOpen,
  Plus,
  Search,
  Settings,
  ChevronRight,
  Grid3X3,
  List
} from 'lucide-react';
import { OrganizationStats } from '../types/organization';

interface OrganizationDashboardProps {
  organizationId?: string;
}

export function OrganizationDashboard({ organizationId }: OrganizationDashboardProps) {
  useNavigate(); // Reserved for navigation features
  useAuth(); // Reserved for auth context features
  const {
    currentOrganization,
    organizations,
    teams,
    projects,
    isLoadingTeams,
    isLoadingProjects,
    navigateTo,
    getOrganizationStats
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'teams' | 'projects'>('all');
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [_showCreateTeam, setShowCreateTeam] = useState(false);
  const [_showCreateProject, setShowCreateProject] = useState(false);

  // Initialize organization if provided
  useEffect(() => {
    if (organizationId && organizations.length > 0) {
      const org = organizations.find(o => o.id === organizationId);
      if (org) {
        navigateTo('organization', organizationId);
      }
    }
  }, [organizationId, organizations, navigateTo]);

  const loadStats = async () => {
    if (!currentOrganization) return;
    try {
      const statsData = await getOrganizationStats(currentOrganization.id);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading organization stats:', error);
    }
  };

  // Load stats when organization changes
  useEffect(() => {
    if (currentOrganization) {
      loadStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization]);

  // Note: Team/Project creation handlers removed - using setShowCreateTeam/setShowCreateProject
  // for dialog state, full implementation planned for future sprint

  const filteredTeams = teams.filter(team =>
    (filterType === 'all' || filterType === 'teams') &&
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    (filterType === 'all' || filterType === 'projects') &&
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">

        <MobileOptimizedHeader />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white/10 border border-white/10 p-8">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-white mb-2">Select an Organization</h2>
                <p className="text-gray-400 mb-6">Choose an organization to view its dashboard</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organizations.map((org) => (
                    <Card
                      key={org.id}
                      interactive
                      className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => navigateTo('organization', org.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Building2 className="h-5 w-5" aria-hidden="true" />
                          {org.name}
                        </CardTitle>
                        {org.description && (
                          <CardDescription className="text-gray-400">
                            {org.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <MobileOptimizedHeader />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <OrganizationBreadcrumb />

          {/* Organization Header */}
          <div className="bg-white/10 rounded-2xl p-8 border border-white/10 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-8 w-8 text-blue-400" aria-hidden="true" />
                  <h1 className="text-4xl font-bold text-white">
                    {currentOrganization.name}
                  </h1>
                </div>
                {currentOrganization.description && (
                  <p className="text-gray-400 mb-4">{currentOrganization.description}</p>
                )}

                {/* Quick Stats */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalTeams}</p>
                      <p className="text-gray-400 text-sm">Teams</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                      <p className="text-gray-400 text-sm">Projects</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                      <p className="text-gray-400 text-sm">Members</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.activeProjects}</p>
                      <p className="text-gray-400 text-sm">Active</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowCreateTeam(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  New Team
                </Button>
                <Button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  New Project
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input
                  placeholder="Search teams and projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filterType === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="text-white"
              >
                All
              </Button>
              <Button
                variant={filterType === 'teams' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('teams')}
                className="text-white"
              >
                Teams
              </Button>
              <Button
                variant={filterType === 'projects' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('projects')}
                className="text-white"
              >
                Projects
              </Button>

              <div className="w-px h-6 bg-white/20 mx-2" />

              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="p-2"
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-2"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Teams Section */}
          {(filterType === 'all' || filterType === 'teams') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-400" aria-hidden="true" />
                  Teams
                </h2>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {filteredTeams.length}
                </Badge>
              </div>

              {isLoadingTeams ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-white/10 border border-white/10 animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-white/10 rounded"></div>
                        <div className="h-4 bg-white/5 rounded"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {filteredTeams.map((team) => (
                    <Card
                      key={team.id}
                      interactive
                      className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => navigateTo('team', team.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
                            {team.name}
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        </CardTitle>
                        {team.description && (
                          <CardDescription className="text-gray-400">
                            {team.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">
                            Created {new Date(team.createdAt).toLocaleDateString()}
                          </span>
                          {team.settings?.isPrivate && (
                            <Badge variant="secondary" className="text-xs">
                              Private
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects Section */}
          {(filterType === 'all' || filterType === 'projects') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FolderOpen className="h-6 w-6 text-purple-400" aria-hidden="true" />
                  Projects
                </h2>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {filteredProjects.length}
                </Badge>
              </div>

              {isLoadingProjects ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-white/10 border border-white/10 animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-white/10 rounded"></div>
                        <div className="h-4 bg-white/5 rounded"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {filteredProjects.map((project) => (
                    <Card
                      key={project.id}
                      interactive
                      className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => navigateTo('project', project.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-purple-400" aria-hidden="true" />
                            {project.name}
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="text-gray-400">
                            {project.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            className={`text-xs ${
                              project.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              project.status === 'planning' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              project.status === 'completed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                              'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            }`}
                          >
                            {project.status}
                          </Badge>
                          <Badge
                            className={`text-xs ${
                              project.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              project.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              project.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-green-500/20 text-green-400 border-green-500/30'
                            }`}
                          >
                            {project.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-400">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default OrganizationDashboard;
