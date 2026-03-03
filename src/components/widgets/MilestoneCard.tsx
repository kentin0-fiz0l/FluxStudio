import { motion } from 'framer-motion';
import { LazyImage } from '../LazyImage';
import type { Priority } from '../../types/messaging';
import type { ProjectMilestone } from './projectCommunicationMockData';

export function MilestoneCard({ milestone }: { milestone: ProjectMilestone }) {
  const getStatusColor = (status: ProjectMilestone['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = milestone.dueDate < new Date() && milestone.status !== 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${
        isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      } hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-900">{milestone.name}</h4>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(milestone.priority)}`}>
            {milestone.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{milestone.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${milestone.progress}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`h-2 rounded-full ${
              milestone.status === 'completed' ? 'bg-green-500' :
              milestone.status === 'blocked' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {milestone.assignees.map((assignee) => (
            <div
              key={assignee.id}
              className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center"
            >
              {assignee.avatar ? (
                <LazyImage src={assignee.avatar} alt={assignee.name} width={24} height={24} className="rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  {assignee.name.charAt(0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          Due {milestone.dueDate.toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}
