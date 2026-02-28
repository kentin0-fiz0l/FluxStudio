/**
 * Comment utility functions and constants
 * Extracted from TaskComments.tsx for modularity
 */

export const COMMENT_ROW_HEIGHT = 100;

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

/**
 * Format relative time from ISO date string
 */
export const formatRelativeTime = (isoDate: string): string => {
  const now = new Date();
  const date = new Date(isoDate);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Get initials from name for avatar
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Get consistent color for user based on their ID
 */
export const getUserColor = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/**
 * Render markdown with @mention highlighting
 */
export const renderMarkdown = (text: string): string => {
  let rendered = text;
  rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  rendered = rendered.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
  rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-neutral-100 text-neutral-900 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  rendered = rendered.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700 underline">$1</a>'
  );
  rendered = rendered.replace(
    /@(\w+)/g,
    '<span class="text-primary-600 font-semibold bg-primary-50 px-1 rounded">@$1</span>'
  );
  rendered = rendered.replace(/\n/g, '<br/>');
  return rendered;
};

/**
 * Extract @mentions from text
 */
export const extractMentions = (text: string, teamMembers: TeamMember[]): string[] => {
  const mentionPattern = /@(\w+)/g;
  const matches = Array.from(text.matchAll(mentionPattern));
  const mentionedNames = matches.map((match) => match[1].toLowerCase());

  const mentionedUserIds: string[] = [];
  teamMembers.forEach((member) => {
    const nameLower = member.name.toLowerCase().replace(/\s+/g, '');
    if (mentionedNames.some((mention) => nameLower.includes(mention))) {
      mentionedUserIds.push(member.id);
    }
  });

  return mentionedUserIds;
};
