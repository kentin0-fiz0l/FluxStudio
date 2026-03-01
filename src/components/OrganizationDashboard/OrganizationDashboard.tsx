import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '@/store/slices/authSlice';
import { MobileOptimizedHeader } from '../MobileOptimizedHeader';
import { OrganizationBreadcrumb } from '../OrganizationBreadcrumb';
import { OrganizationStats } from '../../types/organization';
import type { OrganizationDashboardProps } from './org-dashboard-types';
import { OrgSelector } from './OrgSelector';
import { OrgHeader } from './OrgHeader';
import { OrgSearchBar } from './OrgSearchBar';
import { TeamsSection } from './TeamsSection';
import { ProjectsSection } from './ProjectsSection';

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

  const filteredTeams = teams.filter(team =>
    (filterType === 'all' || filterType === 'teams') &&
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    (filterType === 'all' || filterType === 'projects') &&
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentOrganization) {
    return <OrgSelector organizations={organizations} navigateTo={navigateTo} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <MobileOptimizedHeader />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <OrganizationBreadcrumb />

          <OrgHeader
            currentOrganization={currentOrganization}
            stats={stats}
            setShowCreateTeam={setShowCreateTeam}
            setShowCreateProject={setShowCreateProject}
          />

          <OrgSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {(filterType === 'all' || filterType === 'teams') && (
            <TeamsSection
              filteredTeams={filteredTeams}
              isLoadingTeams={isLoadingTeams}
              viewMode={viewMode}
              navigateTo={navigateTo}
            />
          )}

          {(filterType === 'all' || filterType === 'projects') && (
            <ProjectsSection
              filteredProjects={filteredProjects}
              isLoadingProjects={isLoadingProjects}
              viewMode={viewMode}
              navigateTo={navigateTo}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizationDashboard;
