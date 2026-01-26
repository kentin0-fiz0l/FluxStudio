/**
 * FloatingMessageButton - Floating action button for quick access to messaging
 */

// React import not needed with JSX transform
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useMessaging } from '../../hooks/useMessaging';
import { cn } from '../../lib/utils';

interface FloatingMessageButtonProps {
  onClick: () => void;
  isMessagingOpen: boolean;
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function FloatingMessageButton({
  onClick,
  isMessagingOpen,
  className,
  position = 'bottom-right'
}: FloatingMessageButtonProps) {
  const { unreadCount } = useMessaging();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <AnimatePresence>
      {!isMessagingOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn(
            'fixed z-50',
            positionClasses[position],
            className
          )}
        >
          <Button
            onClick={onClick}
            size="lg"
            className={cn(
              'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300',
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
              'text-white border-0 relative group'
            )}
          >
            <MessageSquare className="h-6 w-6" />

            {/* Unread count badge */}
            {unreadCount > 0 && (
              <Badge
                variant="error"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs font-bold bg-red-500 border-2 border-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}

            {/* Pulse animation for new messages */}
            {unreadCount > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400 opacity-75"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.75, 0.3, 0.75]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}

            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-sm px-3 py-1 rounded-md whitespace-nowrap">
                {unreadCount > 0 ? `${unreadCount} new messages` : 'Open messages'}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}