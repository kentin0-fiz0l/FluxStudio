import { Building2, Plus, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { OrganizationStats } from '../../types/organization';

interface OrgHeaderProps {
  currentOrganization: { name: string; description?: string };
  stats: OrganizationStats | null;
  setShowCreateTeam: (show: boolean) => void;
  setShowCreateProject: (show: boolean) => void;
}

export function OrgHeader({ currentOrganization, stats, setShowCreateTeam, setShowCreateProject }: OrgHeaderProps) {
  return (
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
  );
}
