/**
 * Admin Users Page - Flux Studio
 *
 * User management interface with search, filtering, and bulk actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import {
  Users,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  Key,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type UserStatus = 'active' | 'inactive' | 'pending';
type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
  joined: string;
}

type FilterType = 'all' | UserStatus;

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminUsers() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch users from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', { search: debouncedSearch, status: statusFilter, page: currentPage }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(pageSize),
        excludeSelf: 'false',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiService.get<{ users: User[]; total: number }>('/users', { params });
      if (!res.success) throw new Error(res.error || 'Failed to fetch users');
      return res.data as { users: User[]; total: number };
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const res = await apiService.patch(`/users/${userId}`, { status: newStatus });
      if (!res.success) throw new Error(res.error || 'Failed to update user');
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiService.delete(`/users/${userId}`);
      if (!res.success) throw new Error(res.error || 'Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeleteConfirmId(null);
    },
  });

  // Reset password handler
  const handleResetPassword = useCallback(async (email: string) => {
    try {
      await apiService.post('/auth/forgot-password', { email });
      setOpenDropdown(null);
    } catch {
      // Error handled by apiService
    }
  }, []);

  // Export CSV
  const handleExport = useCallback(() => {
    if (!users.length) return;
    const headers = ['Name', 'Email', 'Role', 'Status', 'Last Active', 'Joined'];
    const rows = users.map(u => [u.name, u.email, u.role, u.status, u.lastActive, u.joined]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [users]);

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    const colors = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {t(`users.filters.${status}`, status)}
      </span>
    );
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      manager: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      member: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      viewer: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role]}`}>
        {t(`users.roles.${role}`, role)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
            {t('title', 'Admin')}
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-gray-900 dark:text-gray-100">{t('users.title', 'Users')}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('users.title', 'User Management')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('users.description', 'Manage user accounts, roles, and permissions.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t('users.add', 'Add User')}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('users.search', 'Search users...')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">{t('users.filters.all', 'All Users')}</option>
              <option value="active">{t('users.filters.active', 'Active')}</option>
              <option value="inactive">{t('users.filters.inactive', 'Inactive')}</option>
              <option value="pending">{t('users.filters.pending', 'Pending')}</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-4">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedUsers.length} selected
            </span>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              Enable
            </button>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              <UserX className="w-4 h-4" aria-hidden="true" />
              Disable
            </button>
            <button className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">
            {error instanceof Error ? error.message : 'Failed to load users.'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete User</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300">
                  {t('users.columns.name', 'Name')}
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('users.columns.role', 'Role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('users.columns.status', 'Status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('users.columns.lastActive', 'Last Active')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('users.columns.joined', 'Joined')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-6 py-4"><div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div>
                        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                        <div className="w-40 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {debouncedSearch || statusFilter !== 'all'
                      ? 'No users match your filters.'
                      : 'No users found.'}
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                        {user.avatar ? (
                          <LazyImage src={user.avatar} alt={user.name} width={40} height={40} className="w-10 h-10 rounded-full" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.joined}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative" ref={openDropdown === user.id ? dropdownRef : undefined}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {openDropdown === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => setOpenDropdown(null)}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.edit', 'Edit User')}
                          </button>
                          <button
                            onClick={() => {
                              handleResetPassword(user.email);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Key className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.resetPassword', 'Reset Password')}
                          </button>
                          <button className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <Shield className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.impersonate', 'Impersonate')}
                          </button>
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          {user.status === 'active' ? (
                            <button
                              onClick={() => {
                                toggleStatusMutation.mutate({ userId: user.id, newStatus: 'inactive' });
                                setOpenDropdown(null);
                              }}
                              disabled={toggleStatusMutation.isPending}
                              className="w-full px-4 py-2 text-sm text-left text-orange-600 dark:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <UserX className="w-4 h-4" aria-hidden="true" />
                              {t('users.actions.disable', 'Disable User')}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                toggleStatusMutation.mutate({ userId: user.id, newStatus: 'active' });
                                setOpenDropdown(null);
                              }}
                              disabled={toggleStatusMutation.isPending}
                              className="w-full px-4 py-2 text-sm text-left text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <UserCheck className="w-4 h-4" aria-hidden="true" />
                              {t('users.actions.enable', 'Enable User')}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeleteConfirmId(user.id);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.delete', 'Delete User')}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!isLoading && users.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, total)} of {total} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
