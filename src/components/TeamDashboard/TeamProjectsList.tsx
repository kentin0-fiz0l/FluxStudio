import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { FolderOpen, Plus, Search, ChevronRight, Clock } from 'lucide-react';
import type { TeamProjectsListProps } from './team-dashboard-types';

export function TeamProjectsList({
  filteredProjects,
  isLoadingProjects,
  navigateTo,
  searchQuery,
  setSearchQuery,
  setShowCreateProject,
}: TeamProjectsListProps) {
  return (
    <div className="lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-purple-400" aria-hidden="true" />
          Team Projects
        </h2>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
          {filteredProjects.length}
        </Badge>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Projects List */}
      {isLoadingProjects ? (
        <div className="space-y-4">
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
        <div className="space-y-4">
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
                  <div className="flex items-center gap-2">
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
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                </CardTitle>
                {project.description && (
                  <CardDescription className="text-gray-400">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
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
              </CardContent>
            </Card>
          ))}

          {filteredProjects.length === 0 && (
            <Card className="bg-white/10 border border-white/10 border-dashed">
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
                <p className="text-gray-400 mb-4">Create your first project to get started</p>
                <Button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
