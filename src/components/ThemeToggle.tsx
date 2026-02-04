import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from './ui/button';

// Use useSyncExternalStore for hydration-safe mounting check
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="btn-glass-ghost text-off-white p-2 w-10 h-10"
        disabled
      >
        <div className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="btn-glass-ghost text-off-white hover:text-white p-2 w-10 h-10 transition-all duration-300"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-180" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}