/**
 * Messaging Utility Functions
 * Shared utilities for formatting, parsing, and display logic
 */

/**
 * Format time relative to now (e.g., "now", "5m", "2h", "3d")
 */
export const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

/**
 * Format message timestamp (e.g., "2:30 PM")
 */
export const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format file size to human readable (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format relative time with more detail (e.g., "just now", "5m ago", "yesterday")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Get date separator text (e.g., "Today", "Yesterday", "Monday, Jan 15")
 */
export const getDateSeparator = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

/**
 * Extract URLs from text content
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return text.match(urlRegex) || [];
};

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 */
export const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Generate a unique ID for pending items
 * Note: This should only be called from event handlers, not during render
 */
let tempIdCounter = 0;
export const generateTempId = (): string => {
  tempIdCounter += 1;
  return `temp_${Date.now()}_${tempIdCounter.toString(36)}`;
};

/**
 * Debounce function for typing indicators
 */
export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Format typing indicator text
 */
export const formatTypingText = (users: string[]): string => {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0]} is typing...`;
  if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
  if (users.length === 3) return `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
  return `${users[0]}, ${users[1]}, + ${users.length - 2} others are typing...`;
};

/**
 * Check if a file is an image based on MIME type
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Check if a file is a video based on MIME type
 */
export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

/**
 * Check if a file is an audio based on MIME type
 */
export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

/**
 * Get file type category from MIME type
 */
export const getFileCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'file' => {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.includes('document')) return 'document';
  return 'file';
};

/**
 * Scroll element into view with smooth behavior
 */
export const scrollIntoView = (element: HTMLElement | null, options?: ScrollIntoViewOptions): void => {
  element?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    ...options
  });
};

/**
 * Format duration in seconds to mm:ss
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Quick reaction emojis for message reactions
 */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👏'] as const;
