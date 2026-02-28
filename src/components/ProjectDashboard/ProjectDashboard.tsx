import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '@/store/slices/authSlice';
import { MobileOptimizedHeader } from '../MobileOptimizedHeader';
import { OrganizationBreadcrumb } from '../OrganizationBreadcrumb';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { FolderOpen } from 'lucide-react';
import { ProjectStats, ProjectMember } from '../../types/organization';
import { ProjectHeader } from './ProjectHeader';
import { FileSearchBar } from './FileSearchBar';
import { FileGrid } from './FileGrid';
import { ProjectSidebar } from './ProjectSidebar';
import type { FilterType } from './project-dashboard-constants';

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
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
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

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || file.category === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">

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
      <MobileOptimizedHeader />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <OrganizationBreadcrumb />

          {/* Project Header */}
          <ProjectHeader
            currentProject={currentProject}
            stats={stats}
            handleFileUpload={handleFileUpload}
          />

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Files Section */}
            <div className="lg:col-span-3">
              {/* Search and Filters */}
              <FileSearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterType={filterType}
                setFilterType={setFilterType}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />

              {/* Files Display */}
              <FileGrid
                isLoadingFiles={isLoadingFiles}
                filteredFiles={filteredFiles}
                viewMode={viewMode}
                handleFileUpload={handleFileUpload}
              />
            </div>

            {/* Project Sidebar */}
            <ProjectSidebar
              stats={stats}
              members={members}
              currentProject={currentProject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default ProjectDashboard;
