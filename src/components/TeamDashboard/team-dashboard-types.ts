import { TeamStats, TeamMember } from '../../types/organization';

export interface TeamDashboardProps {
  teamId?: string;
}

export interface TeamHeaderProps {
  currentTeam: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    settings?: {
      isPrivate?: boolean;
    };
  };
  stats: TeamStats | null;
  setShowCreateProject: (show: boolean) => void;
}

export interface TeamProjectsListProps {
  filteredProjects: Array<{
    id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  isLoadingProjects: boolean;
  navigateTo: (type: 'project' | 'organization' | 'team', id: string) => void | Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowCreateProject: (show: boolean) => void;
}

export interface TeamMembersSidebarProps {
  members: TeamMember[];
  currentTeam: {
    id: string;
    createdAt: string;
  };
}
