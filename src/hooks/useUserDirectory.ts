/**
 * useUserDirectory - Filter, search, and sort state for the User Directory
 */

import { useState, useMemo } from 'react';
import { UserSearchResult } from '@/components/search/UserSearch';

type SortOption = 'name' | 'joinDate' | 'activity' | 'connections';
type SortDirection = 'asc' | 'desc';

interface FilterOptions {
  roles: string[];
  locations: string[];
  organizations: string[];
  skills: string[];
  isOnline?: boolean;
}

// Mock users data - in a real app, this would come from an API
const mockUsers: UserSearchResult[] = [
  {
    id: '1', name: 'Alex Chen', email: 'alex.chen@fluxstudio.com', avatar: undefined,
    role: 'Lead Designer', title: 'Senior UX Designer', organization: 'Flux Studio',
    location: 'San Francisco, CA', joinedAt: '2023-01-15', isOnline: true,
    mutualConnections: 12, skills: ['UI/UX Design', 'Figma', 'Prototyping', 'User Research'],
  },
  {
    id: '2', name: 'Sarah Mitchell', email: 'sarah.mitchell@designco.com', avatar: undefined,
    role: 'Designer', title: 'Product Designer', organization: 'DesignCo',
    location: 'New York, NY', joinedAt: '2023-03-22', isOnline: false,
    mutualConnections: 8, skills: ['Product Design', 'Sketch', 'Design Systems', 'Branding'],
  },
  {
    id: '3', name: 'Marcus Johnson', email: 'marcus.johnson@techcorp.com', avatar: undefined,
    role: 'Developer', title: 'Frontend Developer', organization: 'TechCorp',
    location: 'Austin, TX', joinedAt: '2022-11-08', isOnline: true,
    mutualConnections: 15, skills: ['React', 'TypeScript', 'CSS', 'JavaScript'],
  },
  {
    id: '4', name: 'Emma Rodriguez', email: 'emma.rodriguez@creativeagency.com', avatar: undefined,
    role: 'Creative Director', title: 'Art Director', organization: 'Creative Agency',
    location: 'Los Angeles, CA', joinedAt: '2022-09-14', isOnline: false,
    mutualConnections: 20, skills: ['Art Direction', 'Brand Strategy', 'Adobe Creative Suite', 'Photography'],
  },
  {
    id: '5', name: 'David Kim', email: 'david.kim@startup.io', avatar: undefined,
    role: 'Product Manager', title: 'Senior Product Manager', organization: 'Startup.io',
    location: 'Seattle, WA', joinedAt: '2023-06-10', isOnline: true,
    mutualConnections: 6, skills: ['Product Strategy', 'Analytics', 'Roadmap Planning', 'Agile'],
  },
  {
    id: '6', name: 'Lisa Thompson', email: 'lisa.thompson@freelance.com', avatar: undefined,
    role: 'Freelancer', title: 'Freelance Designer', organization: 'Independent',
    location: 'Remote', joinedAt: '2023-02-28', isOnline: false,
    mutualConnections: 3, skills: ['Graphic Design', 'Illustration', 'Logo Design', 'Print Design'],
  },
];

export function useUserDirectory(currentUserId: string = '1') {
  const [users] = useState<UserSearchResult[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    roles: [],
    locations: [],
    organizations: [],
    skills: [],
    isOnline: undefined,
  });

  const filterOptions = {
    roles: [...new Set(users.map(u => u.role).filter(Boolean))] as string[],
    locations: [...new Set(users.map(u => u.location).filter(Boolean))] as string[],
    organizations: [...new Set(users.map(u => u.organization).filter(Boolean))] as string[],
    skills: [...new Set(users.flatMap(u => u.skills || []))] as string[],
  };

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      if (user.id === currentUserId) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.title?.toLowerCase().includes(query) ||
          user.organization?.toLowerCase().includes(query) ||
          user.location?.toLowerCase().includes(query) ||
          user.skills?.some(skill => skill.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (filters.roles.length > 0 && user.role && !filters.roles.includes(user.role)) return false;
      if (filters.locations.length > 0 && user.location && !filters.locations.includes(user.location)) return false;
      if (filters.organizations.length > 0 && user.organization && !filters.organizations.includes(user.organization)) return false;
      if (filters.skills.length > 0 && user.skills) {
        if (!filters.skills.some(skill => user.skills?.includes(skill))) return false;
      }
      if (filters.isOnline !== undefined && user.isOnline !== filters.isOnline) return false;

      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'joinDate':
          comparison = new Date(a.joinedAt || '').getTime() - new Date(b.joinedAt || '').getTime();
          break;
        case 'activity':
          comparison = (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
          break;
        case 'connections':
          comparison = (b.mutualConnections || 0) - (a.mutualConnections || 0);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [users, searchQuery, filters, sortBy, sortDirection, currentUserId]);

  const toggleFilter = (filterType: keyof FilterOptions, value: string | boolean) => {
    setFilters(prev => {
      if (filterType === 'isOnline') {
        return { ...prev, [filterType]: prev[filterType] === value ? undefined : value as boolean };
      }
      const currentValues = prev[filterType] as string[];
      const newValues = currentValues.includes(value as string)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value as string];
      return { ...prev, [filterType]: newValues };
    });
  };

  const clearFilters = () => {
    setFilters({ roles: [], locations: [], organizations: [], skills: [], isOnline: undefined });
  };

  const hasActiveFilters = Object.values(filters).some(filter =>
    Array.isArray(filter) ? filter.length > 0 : filter !== undefined
  );

  const openUserModal = (user: UserSearchResult) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  return {
    users,
    filteredUsers,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    showFilters,
    setShowFilters,
    selectedUser,
    showUserModal,
    openUserModal,
    closeUserModal,
    filters,
    filterOptions,
    toggleFilter,
    clearFilters,
    hasActiveFilters,
  };
}
