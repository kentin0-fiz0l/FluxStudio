import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Calendar,
  Mail,
  MessageSquare,
  UserPlus,
  Eye,
  X,
  ChevronDown,
  Building
} from 'lucide-react';
import { UserSearchResult } from './search/UserSearch';
import { cn } from '../lib/utils';

interface UserDirectoryProps {
  currentUserId?: string;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

type ViewMode = 'grid' | 'list';
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
    id: '1',
    name: 'Alex Chen',
    email: 'alex.chen@fluxstudio.com',
    avatar: undefined,
    role: 'Lead Designer',
    title: 'Senior UX Designer',
    organization: 'Flux Studio',
    location: 'San Francisco, CA',
    joinedAt: '2023-01-15',
    isOnline: true,
    mutualConnections: 12,
    skills: ['UI/UX Design', 'Figma', 'Prototyping', 'User Research'],
  },
  {
    id: '2',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@designco.com',
    avatar: undefined,
    role: 'Designer',
    title: 'Product Designer',
    organization: 'DesignCo',
    location: 'New York, NY',
    joinedAt: '2023-03-22',
    isOnline: false,
    mutualConnections: 8,
    skills: ['Product Design', 'Sketch', 'Design Systems', 'Branding'],
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@techcorp.com',
    avatar: undefined,
    role: 'Developer',
    title: 'Frontend Developer',
    organization: 'TechCorp',
    location: 'Austin, TX',
    joinedAt: '2022-11-08',
    isOnline: true,
    mutualConnections: 15,
    skills: ['React', 'TypeScript', 'CSS', 'JavaScript'],
  },
  {
    id: '4',
    name: 'Emma Rodriguez',
    email: 'emma.rodriguez@creativeagency.com',
    avatar: undefined,
    role: 'Creative Director',
    title: 'Art Director',
    organization: 'Creative Agency',
    location: 'Los Angeles, CA',
    joinedAt: '2022-09-14',
    isOnline: false,
    mutualConnections: 20,
    skills: ['Art Direction', 'Brand Strategy', 'Adobe Creative Suite', 'Photography'],
  },
  {
    id: '5',
    name: 'David Kim',
    email: 'david.kim@startup.io',
    avatar: undefined,
    role: 'Product Manager',
    title: 'Senior Product Manager',
    organization: 'Startup.io',
    location: 'Seattle, WA',
    joinedAt: '2023-06-10',
    isOnline: true,
    mutualConnections: 6,
    skills: ['Product Strategy', 'Analytics', 'Roadmap Planning', 'Agile'],
  },
  {
    id: '6',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@freelance.com',
    avatar: undefined,
    role: 'Freelancer',
    title: 'Freelance Designer',
    organization: 'Independent',
    location: 'Remote',
    joinedAt: '2023-02-28',
    isOnline: false,
    mutualConnections: 3,
    skills: ['Graphic Design', 'Illustration', 'Logo Design', 'Print Design'],
  }
];

export const UserDirectory: React.FC<UserDirectoryProps> = ({
  currentUserId = '1',
  onConnect,
  onMessage,
  onViewProfile: _onViewProfile
}) => {
  const [users, _setUsers] = useState<UserSearchResult[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = useState<UserSearchResult[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
    isOnline: undefined
  });

  // Extract unique values for filter options
  const filterOptions = {
    roles: [...new Set(users.map(u => u.role).filter(Boolean))] as string[],
    locations: [...new Set(users.map(u => u.location).filter(Boolean))] as string[],
    organizations: [...new Set(users.map(u => u.organization).filter(Boolean))] as string[],
    skills: [...new Set(users.flatMap(u => u.skills || []))] as string[]
  };

  // Apply filters and search
  useEffect(() => {
    const filtered = users.filter(user => {
      // Exclude current user
      if (user.id === currentUserId) return false;

      // Search query
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

      // Role filter
      if (filters.roles.length > 0 && user.role && !filters.roles.includes(user.role)) {
        return false;
      }

      // Location filter
      if (filters.locations.length > 0 && user.location && !filters.locations.includes(user.location)) {
        return false;
      }

      // Organization filter
      if (filters.organizations.length > 0 && user.organization && !filters.organizations.includes(user.organization)) {
        return false;
      }

      // Skills filter
      if (filters.skills.length > 0 && user.skills) {
        const hasMatchingSkill = filters.skills.some(skill => user.skills?.includes(skill));
        if (!hasMatchingSkill) return false;
      }

      // Online status filter
      if (filters.isOnline !== undefined && user.isOnline !== filters.isOnline) {
        return false;
      }

      return true;
    });

    // Apply sorting
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
          // Sort by online status first, then by last activity (mock implementation)
          comparison = (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
          break;
        case 'connections':
          comparison = (b.mutualConnections || 0) - (a.mutualConnections || 0);
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, filters, sortBy, sortDirection, currentUserId]);

  const toggleFilter = (filterType: keyof FilterOptions, value: string | boolean) => {
    setFilters(prev => {
      if (filterType === 'isOnline') {
        return {
          ...prev,
          [filterType]: prev[filterType] === value ? undefined : value as boolean
        };
      }

      const currentValues = prev[filterType] as string[];
      const newValues = currentValues.includes(value as string)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value as string];

      return {
        ...prev,
        [filterType]: newValues
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      roles: [],
      locations: [],
      organizations: [],
      skills: [],
      isOnline: undefined
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter =>
    Array.isArray(filter) ? filter.length > 0 : filter !== undefined
  );

  const _formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <span>User Directory</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Discover and connect with {filteredUsers.length} talented professionals
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, skills, organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex items-center space-x-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={`${sortBy}-${sortDirection}`}
                  onChange={(e) => {
                    const [sort, direction] = e.target.value.split('-');
                    setSortBy(sort as SortOption);
                    setSortDirection(direction as SortDirection);
                  }}
                  className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="joinDate-desc">Newest First</option>
                  <option value="joinDate-asc">Oldest First</option>
                  <option value="activity-desc">Most Active</option>
                  <option value="connections-desc">Most Connected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
                  hasActiveFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    {Object.values(filters).reduce((count, filter) =>
                      count + (Array.isArray(filter) ? filter.length : filter ? 1 : 0), 0
                    )}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {filterOptions.roles.map(role => (
                        <label key={role} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.roles.includes(role)}
                            onChange={() => toggleFilter('roles', role)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {filterOptions.locations.map(location => (
                        <label key={location} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.locations.includes(location)}
                            onChange={() => toggleFilter('locations', location)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">{location}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Organization Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {filterOptions.organizations.map(org => (
                        <label key={org} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.organizations.includes(org)}
                            onChange={() => toggleFilter('organizations', org)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">{org}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.isOnline === true}
                          onChange={() => toggleFilter('isOnline', true)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Online now</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Grid/List */}
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              viewMode={viewMode}
              onConnect={() => onConnect?.(user.id)}
              onMessage={() => onMessage?.(user.id)}
              onViewProfile={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No users available at the moment'
              }
            </p>
            {(searchQuery || hasActiveFilters) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clearFilters();
                }}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Clear search and filters
              </button>
            )}
          </div>
        )}

        {/* User Detail Modal */}
        <UserDetailModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onConnect={() => onConnect?.(selectedUser?.id || '')}
          onMessage={() => onMessage?.(selectedUser?.id || '')}
        />
      </div>
    </div>
  );
};

// User Card Component
interface UserCardProps {
  user: UserSearchResult;
  viewMode: ViewMode;
  onConnect: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  viewMode,
  onConnect,
  onMessage,
  onViewProfile
}) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-600">{user.title}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{user.location}</span>
                  </span>
                )}
                {user.mutualConnections && (
                  <span>{user.mutualConnections} mutual connections</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onViewProfile}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onMessage}
              className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onConnect}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-medium text-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            )}
          </div>
          {user.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-1">{user.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{user.title}</p>

        <div className="space-y-1 text-xs text-gray-500 mb-4">
          {user.organization && (
            <div className="flex items-center justify-center space-x-1">
              <Building className="w-3 h-3" />
              <span>{user.organization}</span>
            </div>
          )}
          {user.location && (
            <div className="flex items-center justify-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{user.location}</span>
            </div>
          )}
          {user.mutualConnections && (
            <div>{user.mutualConnections} mutual connections</div>
          )}
        </div>

        {user.skills && user.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1 justify-center">
              {user.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
              {user.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{user.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={onViewProfile}
            className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            View Profile
          </button>
          <button
            onClick={onMessage}
            className="p-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={onConnect}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// User Detail Modal Component
interface UserDetailModalProps {
  user: UserSearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  onMessage: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose,
  onConnect,
  onMessage
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Header */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-3 border-white rounded-full" />
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-lg text-gray-600">{user.title}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-4 h-4" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </span>
                )}
                {user.joinedAt && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              {user.mutualConnections && (
                <p className="text-sm text-blue-600 mt-1">
                  {user.mutualConnections} mutual connections
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Skills & Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onConnect}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Connect</span>
            </button>
            <button
              onClick={onMessage}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};