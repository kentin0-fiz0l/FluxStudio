import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, Plus, Settings, Shield } from 'lucide-react';
import type { TeamHeaderProps } from './team-dashboard-types';

export function TeamHeader({ currentTeam, stats, setShowCreateProject }: TeamHeaderProps) {
  return (
    <div className="bg-white/10 rounded-2xl p-8 border border-white/10 mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-400" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-white">
              {currentTeam.name}
            </h1>
            {currentTeam.settings?.isPrivate && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
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
