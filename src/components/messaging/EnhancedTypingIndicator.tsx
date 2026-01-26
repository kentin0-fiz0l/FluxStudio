/**
 * Enhanced Typing Indicator Component
 * Shows when users are typing with improved visuals and animations
 */

// React import not needed with JSX transform
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface EnhancedTypingIndicatorProps {
  userIds: string[];
  participants: MessageUser[];
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export function EnhancedTypingIndicator({
  userIds,
  participants,
  className,
  variant = 'default'
}: EnhancedTypingIndicatorProps) {
  const typingUsers = participants.filter(p => userIds.includes(p.id));

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    } else if (typingUsers.length === 3) {
      return `${typingUsers[0].name}, ${typingUsers[1].name}, and ${typingUsers[2].name} are typing`;
    } else {
      return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;
    }
  };

  // Typing dots animation component
  const TypingDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-current rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );

  // Minimal variant - just the dots
  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn('inline-flex items-center gap-1 text-muted-foreground', className)}
      >
        <TypingDots />
      </motion.div>
    );
  }

  // Compact variant - small avatars and text
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50', className)}
      >
        <div className="flex -space-x-1">
          {typingUsers.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar className="w-4 h-4 border border-background">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-[8px]">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          <TypingDots />
        </div>
      </motion.div>
    );
  }

  // Default variant - full featured
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-3 p-3', className)}
    >
      {/* User Avatars */}
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 4).map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: -20 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              delay: index * 0.05
            }}
          >
            <Avatar className="w-6 h-6 border-2 border-background ring-1 ring-primary/20">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-xs">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
      </div>

      {/* Typing Indicator */}
      <div className="flex items-center gap-2">
        {/* Animated Dots Bubble */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-2xl rounded-bl-none"
        >
          <TypingDots />
        </motion.div>

        {/* Typing Text */}
        <div className="flex flex-col">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium text-foreground"
          >
            {getTypingText()}
          </motion.span>

          {/* Additional info for multiple users */}
          {typingUsers.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1 mt-0.5"
            >
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {typingUsers.length} people
              </Badge>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default EnhancedTypingIndicator;
