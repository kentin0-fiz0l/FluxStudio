import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '@/store/slices/authSlice';
import { MobileOptimizedHeader } from '../MobileOptimizedHeader';
import { OrganizationBreadcrumb } from '../OrganizationBreadcrumb';
import { TeamStats, TeamMember } from '../../types/organization';
import type { TeamDashboardProps } from './team-dashboard-types';
import { TeamNotFound } from './TeamNotFound';
import { TeamHeader } from './TeamHeader';
import { TeamProjectsList } from './TeamProjectsList';
import { TeamMembersSidebar } from './TeamMembersSidebar';

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  useAuth();
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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [_showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    if (teamId && currentOrganization) {
      navigateTo('team', teamId);
    }
  }, [teamId, currentOrganization, navigateTo]);

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

  useEffect(() => {
    if (currentTeam) {
      loadTeamData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentTeam) {
    return <TeamNotFound />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <MobileOptimizedHeader />
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <OrganizationBreadcrumb />
          <TeamHeader
            currentTeam={currentTeam}
            stats={stats}
            setShowCreateProject={setShowCreateProject}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <TeamProjectsList
              filteredProjects={filteredProjects}
              isLoadingProjects={isLoadingProjects}
              navigateTo={navigateTo}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setShowCreateProject={setShowCreateProject}
            />
            <TeamMembersSidebar
              members={members}
              currentTeam={currentTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamDashboard;
