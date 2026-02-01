/**
 * TaskTableHeader Component
 * Column headers with sort indicators for task table
 */

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { SortField, SortDirection } from './types';

interface TaskTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export const TaskTableHeader: React.FC<TaskTableHeaderProps> = ({
  sortField,
  sortDirection,
  onSort,
}) => {
  /**
   * Render sort indicator in column header
   */
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;

    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" aria-label="Sorted ascending" />
    ) : (
      <ChevronDown className="w-4 h-4" aria-label="Sorted descending" />
    );
  };

  const getSortLabel = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? 'descending' : 'ascending';
  };

  return (
    <thead>
      <tr className="bg-neutral-50 border-b border-neutral-200">
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 w-12"
        >
          <span className="sr-only">Complete</span>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
        >
          <button
            onClick={() => onSort('status')}
            className="flex items-center gap-2 hover:text-primary-600 transition-colors focus:outline-none focus:text-primary-600"
            aria-label={`Sort by status ${getSortLabel('status')}`}
          >
            Status
            {renderSortIndicator('status')}
          </button>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
        >
          <button
            onClick={() => onSort('title')}
            className="flex items-center gap-2 hover:text-primary-600 transition-colors focus:outline-none focus:text-primary-600"
            aria-label={`Sort by title ${getSortLabel('title')}`}
          >
            Title
            {renderSortIndicator('title')}
          </button>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
        >
          <button
            onClick={() => onSort('priority')}
            className="flex items-center gap-2 hover:text-primary-600 transition-colors focus:outline-none focus:text-primary-600"
            aria-label={`Sort by priority ${getSortLabel('priority')}`}
          >
            Priority
            {renderSortIndicator('priority')}
          </button>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
        >
          Assignee
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-left text-sm font-semibold text-neutral-700"
        >
          <button
            onClick={() => onSort('dueDate')}
            className="flex items-center gap-2 hover:text-primary-600 transition-colors focus:outline-none focus:text-primary-600"
            aria-label={`Sort by due date ${getSortLabel('dueDate')}`}
          >
            Due Date
            {renderSortIndicator('dueDate')}
          </button>
        </th>
        <th
          scope="col"
          className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 w-32"
        >
          Actions
        </th>
      </tr>
    </thead>
  );
};
