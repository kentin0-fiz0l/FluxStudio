/**
 * SearchResultCard Component - Flux Studio
 *
 * Displays a single search result with type icon, highlighted text, and metadata.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SearchResult, SearchResultType } from '../../services/searchService';
import { sanitizeRichText } from '@/lib/sanitize';
import {
  FolderKanban,
  File,
  CheckSquare,
  MessageSquare,
  Clock,
  User,
  ChevronRight,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SearchResultCardProps {
  result: SearchResult;
  onClick: () => void;
  isCompact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTypeIcon(type: SearchResultType, fileType?: string): React.ReactNode {
  if (type === 'file' && fileType) {
    if (fileType.startsWith('image/')) return <FileImage className="w-5 h-5" aria-hidden="true" />;
    if (fileType.startsWith('video/')) return <FileVideo className="w-5 h-5" aria-hidden="true" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="w-5 h-5" aria-hidden="true" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />;
    if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('python')) return <FileCode className="w-5 h-5" aria-hidden="true" />;
    if (fileType.includes('text') || fileType.includes('document')) return <FileText className="w-5 h-5" aria-hidden="true" />;
  }

  const icons: Record<SearchResultType, React.ReactNode> = {
    project: <FolderKanban className="w-5 h-5" aria-hidden="true" />,
    file: <File className="w-5 h-5" aria-hidden="true" />,
    task: <CheckSquare className="w-5 h-5" aria-hidden="true" />,
    message: <MessageSquare className="w-5 h-5" aria-hidden="true" />,
  };

  return icons[type];
}

function getTypeColor(type: SearchResultType): string {
  const colors: Record<SearchResultType, string> = {
    project: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    file: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    task: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    message: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return colors[type];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function getStatusBadge(status?: string): React.ReactNode {
  if (!status) return null;

  const statusColors: Record<string, string> = {
    'active': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'in-progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'completed': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    'todo': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'review': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    'archived': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  const colorClass = statusColors[status.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}>
      {status}
    </span>
  );
}

function getPriorityBadge(priority?: string): React.ReactNode {
  if (!priority) return null;

  const priorityColors: Record<string, string> = {
    'critical': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    'high': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'low': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };

  const colorClass = priorityColors[priority.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}>
      {priority}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SearchResultCard = React.memo(function SearchResultCard({ result, onClick, isCompact = false }: SearchResultCardProps) {
  const { t } = useTranslation('common');
  const typeLabels: Record<SearchResultType, string> = {
    project: t('search.types.project', 'Project'),
    file: t('search.types.file', 'File'),
    task: t('search.types.task', 'Task'),
    message: t('search.types.message', 'Message'),
  };

  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-left"
      >
        <div className={`p-1.5 rounded ${getTypeColor(result.type)}`}>
          {getTypeIcon(result.type, result.metadata.fileType)}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(result.highlightedTitle || result.title) }}
          />
          {result.metadata.projectName && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {result.metadata.projectName}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={`p-2.5 rounded-lg ${getTypeColor(result.type)} flex-shrink-0`}>
          {getTypeIcon(result.type, result.metadata.fileType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Type Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {typeLabels[result.type]}
            </span>
            {result.metadata.status && getStatusBadge(result.metadata.status)}
            {result.metadata.priority && getPriorityBadge(result.metadata.priority)}
          </div>

          {/* Title with highlighting */}
          <h3
            className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors [&>mark]:bg-yellow-200 [&>mark]:dark:bg-yellow-800 [&>mark]:px-0.5 [&>mark]:rounded"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(result.highlightedTitle || result.title) }}
          />

          {/* Description or snippet with highlighting */}
          {(result.highlightedDescription || result.snippet || result.description) && (
            <p
              className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 [&>mark]:bg-yellow-200 [&>mark]:dark:bg-yellow-800 [&>mark]:px-0.5 [&>mark]:rounded"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(result.snippet || result.highlightedDescription || result.description || ''),
              }}
            />
          )}

          {/* Inline Content Preview */}
          {result.type === 'file' && result.metadata.fileType?.startsWith('image/') && result.metadata.thumbnailUrl && (
            <div className="mt-2 mb-2">
              <img
                src={result.metadata.thumbnailUrl}
                alt=""
                className="h-20 max-w-[200px] rounded-md object-cover border border-neutral-200 dark:border-neutral-700"
              />
            </div>
          )}
          {result.type === 'message' && result.metadata.conversationExcerpt && (
            <div className="mt-2 mb-2 pl-3 border-l-2 border-primary-300 dark:border-primary-600">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 italic line-clamp-2">
                {result.metadata.conversationExcerpt}
              </p>
            </div>
          )}
          {result.type === 'file' && result.metadata.fileSize && (
            <div className="mt-1 mb-2">
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded">
                {(result.metadata.fileSize / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {/* Project context */}
            {result.metadata.projectName && (
              <span className="flex items-center gap-1">
                <FolderKanban className="w-3 h-3" aria-hidden="true" />
                {result.metadata.projectName}
              </span>
            )}

            {/* Conversation context for messages */}
            {result.metadata.conversationName && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" aria-hidden="true" />
                {result.metadata.conversationName}
              </span>
            )}

            {/* Author */}
            {result.metadata.author && (
              <span className="flex items-center gap-1">
                {result.metadata.author.avatar ? (
                  <img
                    src={result.metadata.author.avatar}
                    alt={result.metadata.author.name}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <User className="w-3 h-3" aria-hidden="true" />
                )}
                {result.metadata.author.name}
              </span>
            )}

            {/* Time */}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatRelativeTime(result.metadata.createdAt)}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" aria-hidden="true" />
      </div>
    </button>
  );
});

export default SearchResultCard;
