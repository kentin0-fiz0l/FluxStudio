import { Search, Grid3X3, List } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface OrgSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: 'all' | 'teams' | 'projects';
  setFilterType: (type: 'all' | 'teams' | 'projects') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export function OrgSearchBar({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  viewMode,
  setViewMode,
}: OrgSearchBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-8">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Search teams and projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={filterType === 'all' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('all')}
          className="text-white"
        >
          All
        </Button>
        <Button
          variant={filterType === 'teams' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('teams')}
          className="text-white"
        >
          Teams
        </Button>
        <Button
          variant={filterType === 'projects' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('projects')}
          className="text-white"
        >
          Projects
        </Button>

        <div className="w-px h-6 bg-white/20 mx-2" />

        <Button
          variant={viewMode === 'grid' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="p-2"
        >
          <Grid3X3 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="p-2"
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
