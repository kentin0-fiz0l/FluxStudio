import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Building2,
  Users,
  FolderOpen,
  ChevronRight,
  Home
} from 'lucide-react';

export function OrganizationBreadcrumb() {
  const navigate = useNavigate();
  const { breadcrumbs, currentOrganization, currentTeam, currentProject } = useOrganization();

  const getIcon = (type: 'organization' | 'team' | 'project') => {
    switch (type) {
      case 'organization':
        return <Building2 className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Card className="backdrop-blur-md bg-white/5 border border-white/10 p-4 mb-6">
      <div className="flex items-center space-x-2 text-sm">
        {/* Home link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2"
        >
          <Home className="h-4 w-4" />
        </Button>

        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="h-4 w-4 text-white/40" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate(crumb.path)}
              className={`text-white/70 hover:text-white hover:bg-white/10 flex items-center space-x-2 ${
                index === breadcrumbs.length - 1 ? 'text-white font-medium' : ''
              }`}
            >
              {getIcon(crumb.type)}
              <span>{crumb.name}</span>
            </Button>
          </React.Fragment>
        ))}
      </div>

      {/* Current context info */}
      {(currentOrganization || currentTeam || currentProject) && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {currentOrganization && (
              <div className="flex items-center space-x-2 text-white/60">
                <Building2 className="h-3 w-3" />
                <span>Organization: {currentOrganization.name}</span>
              </div>
            )}

            {currentTeam && (
              <div className="flex items-center space-x-2 text-white/60">
                <Users className="h-3 w-3" />
                <span>Team: {currentTeam.name}</span>
              </div>
            )}

            {currentProject && (
              <div className="flex items-center space-x-2 text-white/60">
                <FolderOpen className="h-3 w-3" />
                <span>Project: {currentProject.name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}