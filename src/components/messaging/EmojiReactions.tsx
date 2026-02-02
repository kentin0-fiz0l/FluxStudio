/**
 * Emoji Reactions Component
 * Allows users to add and view emoji reactions on messages
 * Supports quick reactions and full emoji picker
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { MessageUser } from '../../types/messaging';

interface Reaction {
  emoji: string;
  count: number;
  users: MessageUser[];
  hasReacted: boolean;
}

interface EmojiReactionsProps {
  messageId: string;
  reactions?: Map<string, { users: MessageUser[] }>;
  currentUser: MessageUser;
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  className?: string;
}

// Popular emojis for quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

// Extended emoji picker
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Celebration': ['🎉', '🎊', '🎈', '🎂', '🎁', '🎀', '🎆', '🎇', '🧨', '✨', '🎃', '🎄', '🎑', '🎍', '🎋', '🎏'],
  'Symbols': ['✅', '❌', '⭐', '🌟', '💫', '⚡', '🔥', '💯', '👀', '💤', '💬', '🗨️', '👁️', '🧠', '💭']
};

export function EmojiReactions({
  messageId: _messageId,
  reactions = new Map(),
  currentUser,
  onReact,
  onRemoveReaction,
  className
}: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Convert Map to array of Reaction objects
  const reactionList: Reaction[] = Array.from(reactions.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.users.length,
    users: data.users,
    hasReacted: data.users.some(u => u.id === currentUser.id)
  }));

  const handleReactionClick = (emoji: string) => {
    const reaction = reactionList.find(r => r.emoji === emoji);

    if (reaction?.hasReacted) {
      onRemoveReaction(emoji);
    } else {
      onReact(emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    handleReactionClick(emoji);
    setShowPicker(false);
  };

  const formatReactorNames = (users: MessageUser[]) => {
    if (users.length === 0) return '';
    if (users.length === 1) return users[0].name;
    if (users.length === 2) return `${users[0].name} and ${users[1].name}`;
    return `${users[0].name}, ${users[1].name}, and ${users.length - 2} other${users.length - 2 !== 1 ? 's' : ''}`;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Existing Reactions */}
      {reactionList.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {reactionList.map((reaction) => (
            <motion.div
              key={reaction.emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge
                variant={reaction.hasReacted ? 'primary' : 'secondary'}
                className={cn(
                  'cursor-pointer transition-all text-sm px-2 py-0.5',
                  reaction.hasReacted && 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
                )}
                onClick={() => handleReactionClick(reaction.emoji)}
                title={formatReactorNames(reaction.users)}
              >
                <span className="mr-1">{reaction.emoji}</span>
                <span className="text-xs font-medium">{reaction.count}</span>
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Reaction Button */}
      <div className="relative inline-block">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-2 text-xs opacity-70 hover:opacity-100 transition-opacity',
            reactionList.length === 0 && 'ml-0',
            reactionList.length > 0 && 'ml-1'
          )}
          onClick={() => setShowPicker(!showPicker)}
        >
          <Smile className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">React</span>
        </Button>

        {/* Emoji Picker Popover */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
              style={{ width: '320px' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Pick a reaction
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowPicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Reactions */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-1 flex-wrap">
                  {QUICK_REACTIONS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap',
                      selectedCategory === category
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div className="p-3 h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default EmojiReactions;
