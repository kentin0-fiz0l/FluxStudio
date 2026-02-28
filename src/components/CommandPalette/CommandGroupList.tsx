import type { Command } from './command-types';
import { categoryLabels } from './command-constants';
import { CommandItem } from './CommandItem';

interface CommandGroupListProps {
  groupedCommands: Record<string, Command[]>;
  filteredCommands: Command[];
  selectedIndex: number;
  onExecute: (command: Command) => void;
  onSelect: (index: number) => void;
}

export function CommandGroupList({
  groupedCommands,
  filteredCommands,
  selectedIndex,
  onExecute,
  onSelect,
}: CommandGroupListProps) {
  if (filteredCommands.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        No commands found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedCommands).map(
        ([category, cmds]) =>
          cmds.length > 0 && (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                {categoryLabels[category] || category}
              </div>
              <div className="space-y-1">
                {cmds.map((command) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  return (
                    <CommandItem
                      key={command.id}
                      command={command}
                      isSelected={globalIndex === selectedIndex}
                      onExecute={onExecute}
                      onHover={() => onSelect(globalIndex)}
                    />
                  );
                })}
              </div>
            </div>
          )
      )}
    </div>
  );
}
