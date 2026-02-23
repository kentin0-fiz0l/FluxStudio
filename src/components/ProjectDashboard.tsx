import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { EnoBackground } from './EnoBackground';
import { MobileOptimizedHeader } from './MobileOptimizedHeader';
import { OrganizationBreadcrumb } from './OrganizationBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  FolderOpen,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Search,
  Settings,
  Download,
  User,
  Users,
  Clock,
  Activity,
  Upload,
  Grid3X3,
  List,
  MoreVertical,
  Eye
} from 'lucide-react';
import { ProjectStats } from '../types/organization';

interface ProjectDashboardProps {
  projectId?: string;
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const {
    currentProject,
    currentTeam: _currentTeam,
    currentOrganization: _currentOrganization,
    files,
    isLoading: _isLoading,
    isLoadingFiles,
    navigateTo,
    fetchFiles: _fetchFiles,
    uploadFile,
    updateFile: _updateFile,
    deleteFile: _deleteFile,
    getProjectStats,
    getProjectMembers
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'design' | 'reference' | 'final' | 'feedback'>('all');
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [_selectedFiles, _setSelectedFiles] = useState<string[]>([]);

  // Initialize project if provided
  useEffect(() => {
    if (projectId) {
      navigateTo('project', projectId);
    }
  }, [projectId, navigateTo]);

  const loadProjectData = async () => {
    if (!currentProject) return;
    try {
      const [statsData, membersData] = await Promise.all([
        getProjectStats(currentProject.id),
        getProjectMembers(currentProject.id)
      ]);
      setStats(statsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  // Load stats and members when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentProject) return;

    try {
      await uploadFile(currentProject.id, file, {
        category: 'design',
        status: 'draft'
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" aria-hidden="true" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" aria-hidden="true" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" aria-hidden="true" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-5 w-5" aria-hidden="true" />;
    return <FileText className="h-5 w-5" aria-hidden="true" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || file.category === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">
        <EnoBackground />
        <MobileOptimizedHeader />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white/10 border border-white/10 p-8">
              <div className="text-center">
                <FolderOpen className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-white mb-2">Project Not Found</h2>
                <p className="text-gray-400 mb-6">The requested project could not be found or you don't have access to it.</p>
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

          {/* Project Header */}
          <div className="bg-white/10 rounded-2xl p-8 border border-white/10 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FolderOpen className="h-8 w-8 text-purple-400" aria-hidden="true" />
                  <h1 className="text-4xl font-bold text-white">
                    {currentProject.name}
                  </h1>
                  <Badge
                    className={`${
                      currentProject.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      currentProject.status === 'planning' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      currentProject.status === 'completed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                      'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    }`}
                  >
                    {currentProject.status}
                  </Badge>
                  <Badge
                    className={`${
                      currentProject.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      currentProject.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      currentProject.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}
                  >
                    {currentProject.priority}
                  </Badge>
                </div>
                {currentProject.description && (
                  <p className="text-gray-400 mb-4">{currentProject.description}</p>
                )}

                {/* Project Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-sm">
                    <p className="text-gray-400">Created</p>
                    <p className="text-white">{new Date(currentProject.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-400">Type</p>
                    <p className="text-white capitalize">{currentProject.metadata.projectType}</p>
                  </div>
                  {currentProject.dueDate && (
                    <div className="text-sm">
                      <p className="text-gray-400">Due Date</p>
                      <p className="text-white">{new Date(currentProject.dueDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {stats && (
                    <div className="text-sm">
                      <p className="text-gray-400">Progress</p>
                      <p className="text-white">{stats.completionPercentage}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    multiple
                  />
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                    <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                    Upload Files
                  </Button>
                </label>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Files Section */}
            <div className="lg:col-span-3">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      placeholder="Search files..."
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
                    variant={filterType === 'design' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterType('design')}
                    className="text-white"
                  >
                    Design
                  </Button>
                  <Button
                    variant={filterType === 'reference' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterType('reference')}
                    className="text-white"
                  >
                    Reference
                  </Button>
                  <Button
                    variant={filterType === 'final' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterType('final')}
                    className="text-white"
                  >
                    Final
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

              {/* Files Display */}
              {isLoadingFiles ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="bg-white/10 border border-white/10 animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-32 bg-white/10 rounded mb-4"></div>
                        <div className="h-4 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/5 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {filteredFiles.length > 0 ? (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                      {filteredFiles.map((file) => (
                        <Card
                          key={file.id}
                          className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <CardContent className="p-4">
                            {viewMode === 'grid' && (
                              <div className="aspect-video bg-white/5 rounded-lg mb-4 flex items-center justify-center">
                                {file.thumbnailUrl ? (
                                  <img
                                    src={file.thumbnailUrl}
                                    alt={file.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="text-white/40">
                                    {getFileIcon(file.mimeType)}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={`flex ${viewMode === 'list' ? 'items-center gap-4' : 'flex-col'}`}>
                              {viewMode === 'list' && (
                                <div className="text-white/40">
                                  {getFileIcon(file.mimeType)}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium truncate">{file.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={`text-xs ${
                                      file.category === 'design' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                      file.category === 'reference' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                      file.category === 'final' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                    }`}
                                  >
                                    {file.category}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${
                                      file.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                      file.status === 'review' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                      file.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                    }`}
                                  >
                                    {file.status}
                                  </Badge>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">
                                  {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                                  <Download className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-white/10 border border-white/10 border-dashed">
                      <CardContent className="py-12 text-center">
                        <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Files Yet</h3>
                        <p className="text-gray-400 mb-4">Upload your first file to get started</p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            multiple
                          />
                          <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                            Upload Files
                          </Button>
                        </label>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Project Sidebar */}
            <div className="space-y-6">
              {/* Project Stats */}
              {stats && (
                <Card className="bg-white/10 border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-400" aria-hidden="true" />
                      Project Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalFiles}</p>
                      <p className="text-gray-400 text-sm">Files</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                      <p className="text-gray-400 text-sm">Members</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{formatFileSize(stats.totalFileSize)}</p>
                      <p className="text-gray-400 text-sm">Storage Used</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Members */}
              <Card className="bg-white/10 border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    Project Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.slice(0, 5).map((member, index) => (
                      <div key={member.id || index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {member.name || 'Project Member'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {member.role || 'contributor'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">No members assigned</p>
                    )}

                    {members.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full text-white hover:bg-white/10">
                        View All ({members.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/10 border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-400" aria-hidden="true" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                      <div>
                        <p className="text-white">Project created</p>
                        <p className="text-gray-400 text-xs">{new Date(currentProject.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {stats && stats.lastActivity && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-2"></div>
                        <div>
                          <p className="text-white">Last activity</p>
                          <p className="text-gray-400 text-xs">{new Date(stats.lastActivity).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
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
export default ProjectDashboard;
