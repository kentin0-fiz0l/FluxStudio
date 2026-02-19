/**
 * FeedbackForm - Feedback collection with ratings for user testing
 */

import * as React from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { UserTestFeedback } from '@/services/userTestLogger';

export interface FeedbackFormProps {
  feedback: UserTestFeedback | null;
  onSave: (feedback: UserTestFeedback) => void;
}

// Rating Input Component
interface RatingInputProps {
  label: string;
  sublabel: string;
  value: number;
  onChange: (value: number) => void;
}

function RatingInput({ label, sublabel, value, onChange }: RatingInputProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'w-7 h-7 text-xs font-medium rounded transition-colors',
              value >= n
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-amber-200 dark:hover:bg-amber-800'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ feedback, onSave }: FeedbackFormProps) {
  const [confusions, setConfusions] = React.useState<string[]>(
    feedback?.topConfusions || ['', '', '']
  );
  const [clarity, setClarity] = React.useState(feedback?.clarityRating || 5);
  const [speed, setSpeed] = React.useState(feedback?.speedRating || 5);
  const [delight, setDelight] = React.useState(feedback?.delightRating || 5);
  const [comments, setComments] = React.useState(feedback?.additionalComments || '');

  const handleSave = () => {
    onSave({
      topConfusions: confusions.filter(c => c.trim() !== ''),
      clarityRating: clarity,
      speedRating: speed,
      delightRating: delight,
      additionalComments: comments.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Top Confusions (up to 3)
        </label>
        {confusions.map((c, i) => (
          <input
            key={i}
            type="text"
            value={c}
            onChange={(e) => {
              const updated = [...confusions];
              updated[i] = e.target.value;
              setConfusions(updated);
            }}
            placeholder={`Confusion ${i + 1}`}
            className="w-full px-3 py-2 mb-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 text-sm"
          />
        ))}
      </div>

      <RatingInput label="Clarity" sublabel="How clear was the flow?" value={clarity} onChange={setClarity} />
      <RatingInput label="Speed" sublabel="How quick did tasks feel?" value={speed} onChange={setSpeed} />
      <RatingInput label="Delight" sublabel="How enjoyable was the experience?" value={delight} onChange={setDelight} />

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Additional Comments
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Any other thoughts, suggestions, or issues..."
          rows={4}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 text-sm"
        />
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} className="w-full">
        Save Feedback
      </Button>
    </div>
  );
}
