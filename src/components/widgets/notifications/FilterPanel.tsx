import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { FilterState, NotificationType, Priority } from './types';

interface FilterPanelProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function FilterPanel({
  filter,
  onFilterChange,
  isVisible,
  onClose
}: FilterPanelProps) {
  const priorities: Priority[] = ['critical', 'high', 'medium', 'low'];
  const types: NotificationType[] = [
    'message', 'mention', 'file_shared', 'approval_request', 'approval_status',
    'milestone', 'consultation', 'deadline', 'system', 'announcement',
    'invitation', 'comment', 'activity'
  ];

  const togglePriority = (priority: Priority) => {
    const newPriorities = filter.priorities.includes(priority)
      ? filter.priorities.filter(p => p !== priority)
      : [...filter.priorities, priority];
    onFilterChange({ ...filter, priorities: newPriorities });
  };

  const toggleType = (type: NotificationType) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter(t => t !== type)
      : [...filter.types, type];
    onFilterChange({ ...filter, types: newTypes });
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 mt-1"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Filter Notifications</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Status</label>
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              onClick={() => onFilterChange({ ...filter, status })}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.status === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Priority</label>
        <div className="flex gap-2 flex-wrap">
          {priorities.map((priority) => (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.priorities.includes(priority)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Time Range</label>
        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onFilterChange({ ...filter, timeRange: range })}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-2">Types</label>
        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-2 py-1 text-xs rounded text-left transition-colors ${
                filter.types.includes(type)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
