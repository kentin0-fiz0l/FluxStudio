/**
 * IntentNoteInline - Inline intent note editor
 *
 * A compact input for adding/editing intent notes (breadcrumbs).
 * These help users remember what they were working on.
 *
 * Part of Work Momentum: "Leave yourself a breadcrumb."
 */

import * as React from 'react';
import { PenLine, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkingContext } from '@/store';

export interface IntentNoteInlineProps {
  /** Custom className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

export function IntentNoteInline({
  className,
  placeholder = "What were you working on?",
}: IntentNoteInlineProps) {
  const { workingContext, setIntentNote, clearIntentNote } = useWorkingContext();
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const currentNote = workingContext?.intentNote;

  const handleStartEdit = () => {
    setDraft(currentNote ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      setIntentNote(trimmed);
    } else {
      clearIntentNote();
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          maxLength={200}
          className={cn(
            'flex-1 px-2 py-1 text-xs',
            'bg-white dark:bg-neutral-800',
            'border border-amber-300 dark:border-amber-700',
            'rounded focus:outline-none focus:ring-1 focus:ring-amber-500',
            'text-neutral-800 dark:text-neutral-200',
            'placeholder:text-neutral-400'
          )}
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
          aria-label="Save note"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className={cn(
        'flex items-center gap-1.5 text-xs',
        'text-amber-600 dark:text-amber-400',
        'hover:text-amber-700 dark:hover:text-amber-300',
        'transition-colors',
        className
      )}
    >
      <PenLine className="h-3 w-3" />
      <span>{currentNote ? 'Edit note' : 'Add a note'}</span>
    </button>
  );
}

export default IntentNoteInline;
