/**
 * Admin Users Page - Flux Studio
 *
 * User management interface with search, filtering, and bulk actions.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
// MOCK DATA
// ============================================================================

const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', lastActive: '2 min ago', joined: 'Jan 15, 2024' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', status: 'active', lastActive: '1 hour ago', joined: 'Feb 3, 2024' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'member', status: 'active', lastActive: '3 hours ago', joined: 'Feb 10, 2024' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'member', status: 'inactive', lastActive: '2 weeks ago', joined: 'Mar 1, 2024' },
  { id: '5', name: 'Tom Brown', email: 'tom@example.com', role: 'viewer', status: 'pending', lastActive: 'Never', joined: 'Mar 15, 2024' },
  { id: '6', name: 'Emily Davis', email: 'emily@example.com', role: 'manager', status: 'active', lastActive: '30 min ago', joined: 'Mar 20, 2024' },
  { id: '7', name: 'Chris Lee', email: 'chris@example.com', role: 'member', status: 'active', lastActive: '5 hours ago', joined: 'Apr 1, 2024' },
  { id: '8', name: 'Anna Taylor', email: 'anna@example.com', role: 'viewer', status: 'inactive', lastActive: '1 month ago', joined: 'Apr 10, 2024' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminUsers() {
  const { t } = useTranslation('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pageSize = 10;

  // Filter users
  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map((u) => u.id));
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
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
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
            {paginatedUsers.map((user) => (
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
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {openDropdown === user.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                        <button className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          {t('users.actions.edit', 'Edit User')}
                        </button>
                        <button className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Key className="w-4 h-4" aria-hidden="true" />
                          {t('users.actions.resetPassword', 'Reset Password')}
                        </button>
                        <button className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Shield className="w-4 h-4" aria-hidden="true" />
                          {t('users.actions.impersonate', 'Impersonate')}
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        {user.status === 'active' ? (
                          <button className="w-full px-4 py-2 text-sm text-left text-orange-600 dark:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <UserX className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.disable', 'Disable User')}
                          </button>
                        ) : (
                          <button className="w-full px-4 py-2 text-sm text-left text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" aria-hidden="true" />
                            {t('users.actions.enable', 'Enable User')}
                          </button>
                        )}
                        <button className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                          {t('users.actions.delete', 'Delete User')}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
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
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;
