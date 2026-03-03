import * as React from 'react';
import type { Task } from '../../../hooks/useTasks';

export interface TaskMetadataProps {
  task: Task;
}

export const TaskMetadata: React.FC<TaskMetadataProps> = ({ task }) => {
  return (
    <div className="pt-4 border-t border-neutral-200">
      <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
        <div>
          <span className="font-medium">Created:</span>{' '}
          {new Date(task.createdAt).toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium">Updated:</span>{' '}
          {new Date(task.updatedAt).toLocaleDateString()}
        </div>
        {task.completedAt && (
          <div className="col-span-2">
            <span className="font-medium">Completed:</span>{' '}
            {new Date(task.completedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};
