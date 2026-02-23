/**
 * EditableCell Component
 * Generic inline-editable cell for task table
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../ui';
import type { Task } from './types';

interface SelectOption {
  value: string;
  label: string;
}

interface EditableCellProps {
  task: Task;
  field: keyof Task;
  display: React.ReactNode;
  editType?: 'input' | 'select';
  options?: SelectOption[];
  isEditing: boolean;
  isLoading: boolean;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  onStartEdit: (taskId: string, field: keyof Task, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  task,
  field,
  display,
  editType = 'input',
  options,
  isEditing,
  isLoading,
  editValue,
  editInputRef,
  onStartEdit,
  onEditValueChange,
  onSave,
  onCancel,
  onKeyDown,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2" role="status" aria-live="polite">
        <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-neutral-500">Saving...</span>
      </div>
    );
  }

  if (isEditing) {
    if (editType === 'select' && options) {
      return (
        <div className="flex items-center gap-2">
          <select
            ref={editInputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSave}
            className="px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={`Edit ${field}`}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSave}
            aria-label="Save changes"
            className="h-8 px-2"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            aria-label="Cancel editing"
            className="h-8 px-2"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <input
          ref={editInputRef as React.RefObject<HTMLInputElement>}
          type={field === 'dueDate' ? 'date' : 'text'}
          value={editValue}
          onChange={e => onEditValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          className="px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={`Edit ${field}`}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          aria-label="Save changes"
          className="h-8 px-2"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel editing"
          className="h-8 px-2"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onStartEdit(task.id, field, String(task[field] || ''))}
      className="text-left hover:bg-neutral-50 px-2 py-1 -mx-2 -my-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label={`Click to edit ${field}`}
    >
      {display}
    </button>
  );
};
