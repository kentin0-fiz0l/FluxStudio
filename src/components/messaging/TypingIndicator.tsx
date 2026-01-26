/**
 * Typing Indicator Component
 * Shows when users are typing in the conversation
 */

// React import not needed with JSX transform
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface TypingIndicatorProps {
  userIds: string[];
  participants: MessageUser[];
  className?: string;
}

export function TypingIndicator({ userIds, participants, className }: TypingIndicatorProps) {
  const typingUsers = participants.filter(p => userIds.includes(p.id));

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      {/* Avatars */}
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map(user => (
          <Avatar key={user.id} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing Animation */}
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
        </div>
        <span className="text-sm text-muted-foreground">{getTypingText()}</span>
      </div>
    </div>
  );
}

export default TypingIndicator;