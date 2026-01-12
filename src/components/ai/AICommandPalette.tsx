/**
 * AICommandPalette - Quick AI command access via keyboard shortcut
 *
 * Press Cmd+J (or Ctrl+J) to open AI quick actions.
 * Provides fast access to common AI operations.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Wand2,
  Palette,
  Code,
  FileText,
  Image,
  Layout,
  Music,
  Zap,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import { useAI } from '@/store';
import { cn } from '@/lib/utils';

interface AICommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: (input: string) => Promise<void> | void;
  placeholder?: string;
}

interface AICommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export function AICommandPalette({ isOpen, onClose, onOpenChat }: AICommandPaletteProps) {
  const ai = useAI();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [selectedCommand, setSelectedCommand] = React.useState<AICommand | null>(null);
  const [commandInput, setCommandInput] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commands: AICommand[] = React.useMemo(() => [
    {
      id: 'generate-text',
      title: 'Generate Text',
      description: 'Write content, copy, or documentation',
      icon: <FileText className="w-4 h-4" />,
      category: 'Generate',
      placeholder: 'Describe what you want to write...',
      action: async (input) => {
        ai.requestGeneration({ type: 'text', prompt: input, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'generate-code',
      title: 'Generate Code',
      description: 'Create components, functions, or utilities',
      icon: <Code className="w-4 h-4" />,
      category: 'Generate',
      placeholder: 'Describe the code you need...',
      action: async (input) => {
        ai.requestGeneration({ type: 'code', prompt: input, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'color-palette',
      title: 'Generate Color Palette',
      description: 'Create harmonious color schemes',
      icon: <Palette className="w-4 h-4" />,
      category: 'Design',
      placeholder: 'Describe the mood or style (e.g., "modern tech startup")...',
      action: async (input) => {
        ai.requestGeneration({ type: 'suggestion', prompt: `Generate color palette: ${input}`, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'layout-ideas',
      title: 'Layout Suggestions',
      description: 'Get layout and composition ideas',
      icon: <Layout className="w-4 h-4" />,
      category: 'Design',
      placeholder: 'Describe the page or section...',
      action: async (input) => {
        ai.requestGeneration({ type: 'suggestion', prompt: `Suggest layout for: ${input}`, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'improve-design',
      title: 'Improve Design',
      description: 'Get suggestions to enhance current design',
      icon: <Wand2 className="w-4 h-4" />,
      category: 'Analyze',
      placeholder: 'Paste or describe the design to improve...',
      action: async (input) => {
        ai.requestGeneration({ type: 'analysis', prompt: `Improve design: ${input}`, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'summarize',
      title: 'Summarize Content',
      description: 'Create concise summaries of text',
      icon: <Zap className="w-4 h-4" />,
      category: 'Analyze',
      placeholder: 'Paste the text to summarize...',
      action: async (input) => {
        ai.requestGeneration({ type: 'summary', prompt: input, model: ai.preferences.defaultModel });
      },
    },
    {
      id: 'ask-ai',
      title: 'Ask AI Anything',
      description: 'Open chat for detailed conversation',
      icon: <Sparkles className="w-4 h-4" />,
      category: 'Chat',
      action: async () => {
        onClose();
        onOpenChat?.();
      },
    },
  ], [ai, onClose, onOpenChat]);

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Group by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, AICommand[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCommand) {
        if (e.key === 'Escape') {
          setSelectedCommand(null);
          setCommandInput('');
        } else if (e.key === 'Enter' && commandInput.trim()) {
          executeCommand(selectedCommand, commandInput);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelectCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, selectedCommand, commandInput, onClose]);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCommand(null);
      setCommandInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelectCommand = (command: AICommand) => {
    if (command.placeholder) {
      setSelectedCommand(command);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      executeCommand(command, '');
    }
  };

  const executeCommand = async (command: AICommand, input: string) => {
    setIsExecuting(true);
    try {
      await command.action(input);
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                {selectedCommand ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedCommand(null);
                        setCommandInput('');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      {selectedCommand.icon}
                      <span>{selectedCommand.title}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      AI Commands
                    </span>
                  </>
                )}
              </div>

              {/* Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={selectedCommand ? commandInput : query}
                  onChange={(e) =>
                    selectedCommand
                      ? setCommandInput(e.target.value)
                      : setQuery(e.target.value)
                  }
                  placeholder={selectedCommand?.placeholder || 'Search AI commands...'}
                  className="w-full px-11 py-3 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                {isExecuting && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
                )}
              </div>

              {/* Command list */}
              {!selectedCommand && (
                <div className="max-h-80 overflow-y-auto py-2">
                  {Object.entries(groupedCommands).map(([category, cmds]) => (
                    <div key={category}>
                      <div className="px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {category}
                      </div>
                      {cmds.map((command, index) => {
                        const flatIndex = filteredCommands.indexOf(command);
                        const isSelected = flatIndex === selectedIndex;

                        return (
                          <button
                            key={command.id}
                            onClick={() => handleSelectCommand(command)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            )}
                          >
                            <div
                              className={cn(
                                'flex-shrink-0 p-2 rounded-lg',
                                isSelected
                                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              )}
                            >
                              {command.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {command.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {command.description}
                              </div>
                            </div>
                            <ArrowRight
                              className={cn(
                                'w-4 h-4 transition-opacity',
                                isSelected ? 'opacity-100 text-indigo-500' : 'opacity-0'
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {filteredCommands.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No commands found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Execute button for selected command */}
              {selectedCommand && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => executeCommand(selectedCommand, commandInput)}
                    disabled={!commandInput.trim() || isExecuting}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
                      commandInput.trim() && !isExecuting
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">esc</kbd>
                    Close
                  </span>
                </div>
                <span className="text-indigo-500">⌘J</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AICommandPalette;
