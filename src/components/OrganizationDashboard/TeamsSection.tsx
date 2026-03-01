import { Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface TeamsSectionProps {
  filteredTeams: any[];
  isLoadingTeams: boolean;
  viewMode: 'grid' | 'list';
  navigateTo: (view: 'organization' | 'team' | 'project', id: string) => void | Promise<void>;
}

export function TeamsSection({ filteredTeams, isLoadingTeams, viewMode, navigateTo }: TeamsSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-400" aria-hidden="true" />
          Teams
        </h2>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          {filteredTeams.length}
        </Badge>
      </div>

      {isLoadingTeams ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredTeams.map((team) => (
            <Card
              key={team.id}
              interactive
              className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={() => navigateTo('team', team.id)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    {team.name}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </CardTitle>
                {team.description && (
                  <CardDescription className="text-gray-400">
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                  {team.settings?.isPrivate && (
                    <Badge variant="secondary" className="text-xs">
                      Private
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
