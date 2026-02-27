/**
 * Admin Feedback Viewer Page - Flux Studio
 *
 * View and filter beta user feedback submissions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/store/slices/authSlice';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  pageUrl?: string;
  createdAt: string;
}

interface FeedbackResponse {
  feedback: FeedbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminFeedback() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 25;

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(pageSize),
      };
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const result = await apiService.get<FeedbackResponse>(
        '/feedback/admin',
        { params }
      );

      if (result.success && result.data) {
        setFeedback(result.data.feedback);
        setTotalCount(result.data.pagination.total);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, typeFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  const getTypeBadge = (type: FeedbackType) => {
    const config = {
      bug: {
        icon: <Bug className="w-3 h-3" aria-hidden="true" />,
        label: 'Bug',
        classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      },
      feature: {
        icon: <Lightbulb className="w-3 h-3" aria-hidden="true" />,
        label: 'Feature',
        classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      },
      general: {
        icon: <MessageSquare className="w-3 h-3" aria-hidden="true" />,
        label: 'General',
        classes: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      },
    };

    const c = config[type] || config.general;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${c.classes}`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Admin check
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
            {t('title', 'Admin')}
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-gray-900 dark:text-gray-100">Beta Feedback</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Beta Feedback
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Review feedback submissions from beta users.
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FeedbackType | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug Reports</option>
            <option value="feature">Feature Requests</option>
            <option value="general">General Feedback</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount} total submissions
          </span>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              No feedback yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Feedback submitted by beta users will appear here.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feedback.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      {getTypeBadge(item.type)}
                    </td>
                    <td className="px-6 py-4">
                      {expandedId === item.id ? (
                        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {item.message}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(null);
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-3 h-3 inline" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                          {item.message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.userName || 'Anonymous'}
                      </div>
                      {item.userEmail && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.userEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={item.pageUrl}>
                        {item.pageUrl ? new URL(item.pageUrl, window.location.origin).pathname : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(item.createdAt)}
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
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} submissions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // Show pages centered around current page
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
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
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminFeedback;
