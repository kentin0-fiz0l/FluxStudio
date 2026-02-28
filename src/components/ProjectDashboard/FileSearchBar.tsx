import { Search, Grid3X3, List } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { FilterType } from './project-dashboard-constants';

interface FileSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export function FileSearchBar({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  viewMode,
  setViewMode,
}: FileSearchBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Search files..."
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
          variant={filterType === 'design' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('design')}
          className="text-white"
        >
          Design
        </Button>
        <Button
          variant={filterType === 'reference' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('reference')}
          className="text-white"
        >
          Reference
        </Button>
        <Button
          variant={filterType === 'final' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType('final')}
          className="text-white"
        >
          Final
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
