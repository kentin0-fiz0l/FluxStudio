export function PaletteFooter() {
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">↑↓</kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">↵</kbd>
          <span>Select</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">ESC</kbd>
          <span>Close</span>
        </div>
      </div>
    </div>
  );
}
