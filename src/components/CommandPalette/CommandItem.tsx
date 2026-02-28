import { cn } from '@/lib/utils';
import type { Command } from './command-types';

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onExecute: (command: Command) => void;
  onHover: () => void;
}

export function CommandItem({ command, isSelected, onExecute, onHover }: CommandItemProps) {
  const Icon = command.icon;

  return (
    <button
      onClick={() => onExecute(command)}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0',
            isSelected
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-400 dark:text-neutral-500'
          )}
          aria-hidden="true"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{command.label}</div>
        {command.description && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {command.description}
          </div>
        )}
      </div>
      {command.shortcut && (
        <div className="flex items-center gap-1">
          {command.shortcut.map((key, i) => (
            <kbd
              key={i}
              className="px-1.5 py-0.5 text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 rounded"
            >
              {key}
            </kbd>
          ))}
        </div>
      )}
    </button>
  );
}
