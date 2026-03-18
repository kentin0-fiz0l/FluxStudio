/**
 * KeybindingEditor - Inline keybinding remapping UI
 *
 * Renders inside the KeyboardShortcutsDialog when the user clicks "Customize".
 * Each shortcut row becomes editable: click to capture a new key combo.
 */

import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  useKeybindingStore,
  useKeybindingCapture,
  formatKeyBinding,
  type KeyBindingEntry,
} from '@/hooks/useKeybindingStore';

// ============================================================================
// Types
// ============================================================================

interface KeybindingEditorProps {
  onDone: () => void;
}

// ============================================================================
// Group Order
// ============================================================================

const GROUP_ORDER: KeyBindingEntry['group'][] = ['general', 'editing', 'navigation', 'drill'];
const GROUP_LABELS: Record<KeyBindingEntry['group'], string> = {
  general: 'General',
  editing: 'Editing',
  navigation: 'Navigation',
  drill: 'Drill',
};

// ============================================================================
// Component
// ============================================================================

export function KeybindingEditor({ onDone }: KeybindingEditorProps) {
  const { entries, setBinding, resetBinding, resetAll, isCustomized } = useKeybindingStore();
  const { capturing, captured, startCapture, cancelCapture, handleCaptureKeyDown } =
    useKeybindingCapture();

  const handleConfirm = useCallback(
    (id: string) => {
      if (captured) {
        setBinding(id, captured);
      }
      cancelCapture();
    },
    [captured, setBinding, cancelCapture],
  );

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: entries.filter((e) => e.group === group),
  }));

  return (
    <div onKeyDown={handleCaptureKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customize Shortcuts</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Reset All
          </button>
          <button
            onClick={onDone}
            className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Binding Groups */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {grouped.map(({ group, label, items }) => (
          <div key={group}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {label}
            </h3>
            <div className="space-y-1">
              {items.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">{entry.label}</span>

                  <div className="flex items-center gap-1.5">
                    {capturing === entry.id ? (
                      // Capture mode
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 text-xs font-mono bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded border border-yellow-300 dark:border-yellow-700 min-w-[60px] text-center animate-pulse">
                          {captured ? formatKeyBinding(captured) : 'Press key...'}
                        </span>
                        {captured && (
                          <button
                            onClick={() => handleConfirm(entry.id)}
                            className="px-1.5 py-0.5 text-[10px] bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                          >
                            OK
                          </button>
                        )}
                        <button
                          onClick={cancelCapture}
                          className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <button
                          onClick={() => startCapture(entry.id)}
                          className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                            isCustomized(entry.id)
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                          } hover:border-blue-400 dark:hover:border-blue-500`}
                          title="Click to rebind"
                        >
                          {formatKeyBinding(entry.current)}
                        </button>
                        {isCustomized(entry.id) && (
                          <button
                            onClick={() => resetBinding(entry.id)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                            title={`Reset to ${formatKeyBinding(entry.default)}`}
                          >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-400 text-center">
        Click a key to rebind. Customizations are saved locally.
      </p>
    </div>
  );
}

export default KeybindingEditor;
