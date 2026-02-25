/**
 * KeyboardShortcutsDialog - Keyboard shortcuts reference overlay
 */

// KeyboardShortcutsDialog

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '\u2318' : 'Ctrl';

  const groups = [
    {
      title: 'General',
      shortcuts: [
        { keys: `${mod}+S`, desc: 'Save formation' },
        { keys: 'Space', desc: 'Play / Pause' },
        { keys: '?', desc: 'Toggle this dialog' },
      ],
    },
    {
      title: 'Editing',
      shortcuts: [
        { keys: `${mod}+Z`, desc: 'Undo' },
        { keys: `${mod}+Shift+Z`, desc: 'Redo' },
        { keys: `${mod}+A`, desc: 'Select all' },
        { keys: `${mod}+C`, desc: 'Copy selected' },
        { keys: `${mod}+V`, desc: 'Paste' },
        { keys: `${mod}+D`, desc: 'Duplicate selected' },
        { keys: 'Delete', desc: 'Delete selected' },
        { keys: 'Escape', desc: 'Deselect all' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: '\u2191 \u2193 \u2190 \u2192', desc: 'Nudge performer (1 unit)' },
        { keys: 'Shift+Arrow', desc: 'Nudge performer (5 units)' },
        { keys: '+ / -', desc: 'Zoom in / out' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div role="dialog" aria-label="Keyboard shortcuts" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div key={s.desc} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">?</kbd> to toggle</p>
      </div>
    </div>
  );
}
