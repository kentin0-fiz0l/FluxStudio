import { FolderOpen, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface ProjectsSectionProps {
  filteredProjects: any[];
  isLoadingProjects: boolean;
  viewMode: 'grid' | 'list';
  navigateTo: (view: 'organization' | 'team' | 'project', id: string) => void | Promise<void>;
}

export function ProjectsSection({ filteredProjects, isLoadingProjects, viewMode, navigateTo }: ProjectsSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-purple-400" aria-hidden="true" />
          Projects
        </h2>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
          {filteredProjects.length}
        </Badge>
      </div>

      {isLoadingProjects ? (
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
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              interactive
              className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={() => navigateTo('project', project.id)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-purple-400" aria-hidden="true" />
                    {project.name}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </CardTitle>
                {project.description && (
                  <CardDescription className="text-gray-400">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    className={`text-xs ${
                      project.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      project.status === 'planning' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      project.status === 'completed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                      'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    }`}
                  >
                    {project.status}
                  </Badge>
                  <Badge
                    className={`text-xs ${
                      project.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      project.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      project.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}
                  >
                    {project.priority}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
