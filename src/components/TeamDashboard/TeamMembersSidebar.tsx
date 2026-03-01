import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, Plus, User, Activity } from 'lucide-react';
import type { TeamMembersSidebarProps } from './team-dashboard-types';

export function TeamMembersSidebar({ members, currentTeam }: TeamMembersSidebarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
          Team Members
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <Card key={member.id || index} className="bg-white/10 border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" aria-hidden="true" />
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
              <Users className="h-8 w-8 text-white/40 mx-auto mb-2" aria-hidden="true" />
              <p className="text-gray-400 text-sm">No members yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Activity */}
      <Card className="bg-white/10 border border-white/10 mt-6">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" aria-hidden="true" />
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
  );
}
