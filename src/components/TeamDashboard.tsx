import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { EnoBackground } from './EnoBackground';
import { MobileOptimizedHeader } from './MobileOptimizedHeader';
import { OrganizationBreadcrumb } from './OrganizationBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Users,
  FolderOpen,
  Plus,
  Search,
  Settings,
  ChevronRight,
  User,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { TeamStats } from '../types/organization';

interface TeamDashboardProps {
  teamId?: string;
}

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const navigate = useNavigate();
  useAuth(); // Reserved for auth context features
  const {
    currentTeam,
    currentOrganization,
    projects,
    isLoadingProjects,
    navigateTo,
    getTeamStats,
    getTeamMembers
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [_showCreateProject, setShowCreateProject] = useState(false);

  // Initialize team if provided
  useEffect(() => {
    if (teamId && currentOrganization) {
      navigateTo('team', teamId);
    }
  }, [teamId, currentOrganization, navigateTo]);

  // Load stats and members when team changes
  useEffect(() => {
    if (currentTeam) {
      loadTeamData();
    }
  }, [currentTeam]);

  const loadTeamData = async () => {
    if (!currentTeam) return;
    try {
      const [statsData, membersData] = await Promise.all([
        getTeamStats(currentTeam.id),
        getTeamMembers(currentTeam.id)
      ]);
      setStats(statsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  // Note: Project creation handler removed - using setShowCreateProject for dialog state

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">
        <EnoBackground />
        <MobileOptimizedHeader />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white/10 border border-white/10 p-8">
              <div className="text-center">
                <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Team Not Found</h2>
                <p className="text-gray-400 mb-6">The requested team could not be found or you don't have access to it.</p>
                <Button onClick={() => navigate('/dashboard')} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Return to Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <EnoBackground />
      <MobileOptimizedHeader />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <OrganizationBreadcrumb />

          {/* Team Header */}
          <div className="bg-white/10 rounded-2xl p-8 border border-white/10 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-8 w-8 text-blue-400" />
                  <h1 className="text-4xl font-bold text-white">
                    {currentTeam.name}
                  </h1>
                  {currentTeam.settings?.isPrivate && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      <Shield className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                {currentTeam.description && (
                  <p className="text-gray-400 mb-4">{currentTeam.description}</p>
                )}

                {/* Quick Stats */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                      <p className="text-gray-400 text-sm">Members</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                      <p className="text-gray-400 text-sm">Projects</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.activeProjects}</p>
                      <p className="text-gray-400 text-sm">Active</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.completedProjects}</p>
                      <p className="text-gray-400 text-sm">Completed</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projects Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FolderOpen className="h-6 w-6 text-purple-400" />
                  Team Projects
                </h2>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {filteredProjects.length}
                </Badge>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Projects List */}
              {isLoadingProjects ? (
                <div className="space-y-4">
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
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => navigateTo('project', project.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-purple-400" />
                            {project.name}
                          </div>
                          <div className="flex items-center gap-2">
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
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="text-gray-400">
                            {project.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="h-3 w-3" />
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </div>
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
                      </CardContent>
                    </Card>
                  ))}

                  {filteredProjects.length === 0 && (
                    <Card className="bg-white/10 border border-white/10 border-dashed">
                      <CardContent className="py-12 text-center">
                        <FolderOpen className="h-12 w-12 text-white/40 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
                        <p className="text-gray-400 mb-4">Create your first project to get started</p>
                        <Button
                          onClick={() => setShowCreateProject(true)}
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Team Members Sidebar */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  Team Members
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((member, index) => (
                  <Card key={member.id || index} className="bg-white/10 border border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {member.name || 'Team Member'}
                          </p>
                          <p className="text-gray-400 text-sm truncate">
                            {member.email || `member${index + 1}@example.com`}
                          </p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          {member.role || 'member'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {members.length === 0 && (
                  <Card className="bg-white/10 border border-white/10 border-dashed">
                    <CardContent className="py-8 text-center">
                      <Users className="h-8 w-8 text-white/40 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No members yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Team Activity */}
              <Card className="bg-white/10 border border-white/10 mt-6">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                      <div>
                        <p className="text-white">Team created</p>
                        <p className="text-gray-400 text-xs">{new Date(currentTeam.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TeamDashboard;
