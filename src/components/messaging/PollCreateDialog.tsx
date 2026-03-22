/**
 * PollCreateDialog Component
 * Create a quick poll with a question and 2-4 options.
 */

import { useState, useRef, useEffect } from 'react';
import { BarChart3, X, Plus, Trash2 } from 'lucide-react';

export interface PollData {
  question: string;
  options: string[];
}

interface PollCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePoll: (poll: PollData) => void;
}

export function PollCreateDialog({ open, onOpenChange, onCreatePoll }: PollCreateDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const questionRef = useRef<HTMLInputElement>(null);

  // Focus question input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => questionRef.current?.focus(), 100);
    } else {
      setQuestion('');
      setOptions(['', '']);
    }
  }, [open]);

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);

    if (!trimmedQuestion || trimmedOptions.length < 2) return;

    onCreatePoll({ question: trimmedQuestion, options: trimmedOptions });
    onOpenChange(false);
  };

  const isValid = question.trim() && options.filter((o) => o.trim()).length >= 2;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="w-full max-w-md mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" aria-hidden="true" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Create Poll</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <X className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <div className="px-4 py-4 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Question
            </label>
            <input
              ref={questionRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 4 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add option
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
}

export default PollCreateDialog;
