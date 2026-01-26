import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Search,
  X,
  User,
  Users,
  Building2,
  Check,
  UserPlus,
  Mail,
  MapPin,
  Briefcase
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  title?: string;
  organization?: string;
  location?: string;
  joinedAt?: string;
  isOnline?: boolean;
  mutualConnections?: number;
  skills?: string[];
  isSelected?: boolean;
}

interface UserSearchProps {
  placeholder?: string;
  multiple?: boolean;
  selectedUsers?: UserSearchResult[];
  excludeUserIds?: string[];
  onUserSelect?: (user: UserSearchResult) => void;
  onUserRemove?: (userId: string) => void;
  onUsersChange?: (users: UserSearchResult[]) => void;
  className?: string;
  showUserDetails?: boolean;
  searchFilters?: {
    role?: string[];
    organization?: string[];
    skills?: string[];
  };
  maxResults?: number;
  allowInviteByEmail?: boolean;
  theme?: 'light' | 'dark';
}

export function UserSearch({
  placeholder = "Search for users...",
  multiple = false,
  selectedUsers = [],
  excludeUserIds = [],
  onUserSelect,
  onUserRemove,
  onUsersChange,
  className,
  showUserDetails = true,
  searchFilters,
  maxResults = 50,
  allowInviteByEmail = true,
  theme = 'light'
}: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentUsers, setRecentUsers] = useState<UserSearchResult[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Mock user data - in real app, this would come from API
  const mockUsers: UserSearchResult[] = [
    {
      id: 'user-1',
      name: 'Sarah Chen',
      email: 'sarah.chen@fluxstudio.com',
      avatar: 'https://placeholders.dev/150x150/4338ca/ffffff/png?text=SC',
      role: 'Designer',
      title: 'Senior UI/UX Designer',
      organization: 'FluxStudio Design Team',
      location: 'San Francisco, CA',
      joinedAt: '2023-01-15',
      isOnline: true,
      mutualConnections: 12,
      skills: ['UI Design', 'Prototyping', 'Figma', 'Adobe Creative Suite']
    },
    {
      id: 'user-2',
      name: 'Marcus Johnson',
      email: 'marcus.j@creativeco.com',
      avatar: 'https://placeholders.dev/150x150/7c3aed/ffffff/png?text=MJ',
      role: 'Developer',
      title: 'Full Stack Developer',
      organization: 'Creative Co.',
      location: 'Austin, TX',
      joinedAt: '2023-03-22',
      isOnline: false,
      mutualConnections: 8,
      skills: ['React', 'Node.js', 'TypeScript', 'AWS']
    },
    {
      id: 'user-3',
      name: 'Emily Rodriguez',
      email: 'emily.r@designworks.io',
      role: 'Designer',
      title: 'Creative Director',
      organization: 'DesignWorks',
      location: 'New York, NY',
      joinedAt: '2022-11-10',
      isOnline: true,
      mutualConnections: 15,
      skills: ['Brand Design', 'Art Direction', 'Strategy', 'Team Leadership']
    },
    {
      id: 'user-4',
      name: 'David Kim',
      email: 'david.kim@techstart.com',
      avatar: 'https://placeholders.dev/150x150/059669/ffffff/png?text=DK',
      role: 'Product Manager',
      title: 'Senior Product Manager',
      organization: 'TechStart Inc.',
      location: 'Seattle, WA',
      joinedAt: '2023-02-05',
      isOnline: true,
      mutualConnections: 22,
      skills: ['Product Strategy', 'Analytics', 'Agile', 'User Research']
    },
    {
      id: 'user-5',
      name: 'Lisa Wong',
      email: 'lisa.wong@fluxstudio.com',
      role: 'Designer',
      title: 'Motion Graphics Designer',
      organization: 'FluxStudio Design Team',
      location: 'Los Angeles, CA',
      joinedAt: '2023-04-12',
      isOnline: false,
      mutualConnections: 18,
      skills: ['After Effects', 'Cinema 4D', 'Motion Design', 'Animation']
    }
  ];

  // Load recent users from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentUserSearches');
    if (recent) {
      try {
        setRecentUsers(JSON.parse(recent).slice(0, 5));
      } catch (error) {
        console.error('Error loading recent users:', error);
      }
    }
  }, []);

  // Save user to recent searches
  const saveToRecentUsers = useCallback((user: UserSearchResult) => {
    const newRecent = [user, ...recentUsers.filter(u => u.id !== user.id)].slice(0, 5);
    setRecentUsers(newRecent);
    localStorage.setItem('recentUserSearches', JSON.stringify(newRecent));
  }, [recentUsers]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Filter mock users based on search query and filters
      const filteredUsers = mockUsers.filter(user => {
        // Exclude already selected users and excluded user IDs
        if (selectedUsers.some(selected => selected.id === user.id)) return false;
        if (excludeUserIds.includes(user.id)) return false;

        // Search in name, email, title, organization
        const searchLower = query.toLowerCase();
        const matchesQuery =
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.title?.toLowerCase().includes(searchLower) ||
          user.organization?.toLowerCase().includes(searchLower) ||
          user.skills?.some(skill => skill.toLowerCase().includes(searchLower));

        if (!matchesQuery) return false;

        // Apply filters if provided
        if (searchFilters?.role && searchFilters.role.length > 0) {
          if (!user.role || !searchFilters.role.includes(user.role)) return false;
        }

        if (searchFilters?.organization && searchFilters.organization.length > 0) {
          if (!user.organization || !searchFilters.organization.includes(user.organization)) return false;
        }

        if (searchFilters?.skills && searchFilters.skills.length > 0) {
          if (!user.skills || !searchFilters.skills.some(skill =>
            user.skills?.some(userSkill => userSkill.toLowerCase().includes(skill.toLowerCase()))
          )) return false;
        }

        return true;
      });

      // Sort by relevance (online status, mutual connections, name)
      filteredUsers.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        if (a.mutualConnections !== b.mutualConnections) return (b.mutualConnections || 0) - (a.mutualConnections || 0);
        return a.name.localeCompare(b.name);
      });

      setSearchResults(filteredUsers.slice(0, maxResults));
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedUsers, excludeUserIds, searchFilters, maxResults]);

  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setHighlightedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle user selection
  const handleUserSelect = (user: UserSearchResult) => {
    if (multiple) {
      const newUsers = [...selectedUsers, user];
      onUsersChange?.(newUsers);
    } else {
      setSearchQuery('');
      setIsOpen(false);
    }

    onUserSelect?.(user);
    saveToRecentUsers(user);
    setSearchResults([]);
    setHighlightedIndex(-1);
  };

  // Handle user removal (for multiple selection)
  const handleUserRemove = (userId: string) => {
    const newUsers = selectedUsers.filter(user => user.id !== userId);
    onUsersChange?.(newUsers);
    onUserRemove?.(userId);
  };

  // Handle email invitation
  const handleEmailInvite = (email: string) => {
    if (!email || !allowInviteByEmail) return;

    const emailUser: UserSearchResult = {
      id: `email-${Date.now()}`,
      name: email,
      email: email,
      role: 'Invited'
    };

    handleUserSelect(emailUser);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          handleUserSelect(searchResults[highlightedIndex]);
        } else if (allowInviteByEmail && searchQuery.includes('@')) {
          handleEmailInvite(searchQuery);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Check if email is valid
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent",
            theme === 'dark'
              ? "bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-purple-500"
              : "bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
          )}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Selected Users (for multiple selection) */}
      {multiple && selectedUsers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs bg-blue-500 text-white">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
              {user.role && (
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUserRemove(user.id)}
                className="h-5 w-5 p-0 hover:bg-red-100 text-gray-400 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={resultsRef}
          className={cn(
            "absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-96 overflow-y-auto",
            theme === 'dark'
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          )}
        >
          {/* Recent Users (when no search query) */}
          {!searchQuery && recentUsers.length > 0 && (
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent</h4>
              {recentUsers.map((user) => (
                <UserSearchItem
                  key={user.id}
                  user={user}
                  showDetails={showUserDetails}
                  onClick={() => handleUserSelect(user)}
                />
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="p-3">
              {searchResults.length > 0 ? (
                <>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                  </h4>
                  {searchResults.map((user, index) => (
                    <UserSearchItem
                      key={user.id}
                      user={user}
                      showDetails={showUserDetails}
                      isHighlighted={index === highlightedIndex}
                      onClick={() => handleUserSelect(user)}
                    />
                  ))}
                </>
              ) : !isLoading ? (
                <div className="text-center py-6">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No users found</p>
                  {allowInviteByEmail && isValidEmail(searchQuery) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailInvite(searchQuery)}
                      className="mt-3"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite {searchQuery}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-6 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-500">Searching users...</p>
            </div>
          )}

          {/* Email Invitation Option */}
          {allowInviteByEmail && searchQuery && isValidEmail(searchQuery) && searchResults.length === 0 && !isLoading && (
            <div className="border-t border-gray-200 p-3">
              <Button
                variant="outline"
                onClick={() => handleEmailInvite(searchQuery)}
                className="w-full justify-start"
              >
                <Mail className="h-4 w-4 mr-2" />
                Invite "{searchQuery}" via email
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// User Search Item Component
interface UserSearchItemProps {
  user: UserSearchResult;
  showDetails?: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
}

function UserSearchItem({ user, showDetails = true, isHighlighted, onClick }: UserSearchItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        isHighlighted ? "bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-primary-600 text-white">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {user.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{user.name}</p>
          {user.role && (
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-500 truncate">{user.email}</p>

        {showDetails && (user.title || user.organization) && (
          <p className="text-xs text-gray-400 truncate">
            {user.title}{user.title && user.organization && ' at '}{user.organization}
          </p>
        )}

        {showDetails && user.mutualConnections && user.mutualConnections > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Users className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {user.mutualConnections} mutual connection{user.mutualConnections !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {user.isSelected && (
        <Check className="h-4 w-4 text-green-600" />
      )}
    </div>
  );
}