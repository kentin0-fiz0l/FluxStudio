/**
 * FeedbackWidget - Floating feedback button with slide-over panel
 *
 * Sprint 56: Collects bug reports, feature requests, and general feedback
 * from authenticated users during the beta period.
 */

import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, Loader2, Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type FeedbackType = 'bug' | 'feature' | 'general';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Feature', icon: Lightbulb },
  { value: 'general', label: 'General', icon: MessageCircle },
];

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await apiService.post('/feedback', {
        type,
        message: message.trim(),
        pageUrl: window.location.href,
      });
      toast.success('Thanks for your feedback!');
      setMessage('');
      setType('general');
      setIsOpen(false);
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all',
          'bg-blue-600 hover:bg-blue-700 text-white',
          'hover:scale-105 active:scale-95',
          isOpen && 'bg-gray-600 hover:bg-gray-700'
        )}
        aria-label={isOpen ? 'Close feedback' : 'Send feedback'}
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Slide-over panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Send Feedback
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Help us improve FluxStudio
            </p>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    type === value
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {/* Message textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'Describe the bug and steps to reproduce...'
                  : type === 'feature'
                  ? 'Describe the feature you\'d like to see...'
                  : 'Tell us what\'s on your mind...'
              }
              className="w-full h-28 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none"
              maxLength={5000}
            />

            {/* Character count */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {message.length}/5000
              </span>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-blue-600 hover:bg-blue-700 text-white
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
