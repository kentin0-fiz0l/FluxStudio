import { UserSearchResult } from '../search/UserSearch';

export interface UserDirectoryProps {
  currentUserId?: string;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export interface UserDirectoryListProps {
  users: UserSearchResult[];
  viewMode: 'grid' | 'list';
  searchQuery: string;
  hasActiveFilters: boolean;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onViewProfile: (user: UserSearchResult) => void;
  onClearSearch: () => void;
}

export interface UserCardProps {
  user: UserSearchResult;
  viewMode: 'grid' | 'list';
  onConnect: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}

export interface UserDetailModalProps {
  user: UserSearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export interface UserDirectoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortValue: string;
  onSortChange: (sortBy: string, direction: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  filterOptions: {
    roles: string[];
    locations: string[];
    organizations: string[];
  };
  filters: {
    roles: string[];
    locations: string[];
    organizations: string[];
    isOnline?: boolean;
  };
  onToggleFilter: (type: 'roles' | 'locations' | 'organizations' | 'skills' | 'isOnline', value: string | boolean) => void;
  onClearFilters: () => void;
}
