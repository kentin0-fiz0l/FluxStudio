import { Activity, Users, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatFileSize } from './project-dashboard-utils';
import { ProjectStats, ProjectMember } from '../../types/organization';

interface ProjectSidebarProps {
  stats: ProjectStats | null;
  members: ProjectMember[];
  currentProject: {
    createdAt: string;
  };
}

export function ProjectSidebar({ stats, members, currentProject }: ProjectSidebarProps) {
  return (
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
  );
}
