/**
 * ThemeToggle Component - UI for switching themes
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useTheme, Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" aria-hidden="true" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" aria-hidden="true" /> },
    { value: 'auto', label: 'System', icon: <Monitor className="w-4 h-4" aria-hidden="true" /> },
  ];

  const currentIcon = resolvedTheme === 'dark' ?
    <Moon className="w-4 h-4" aria-hidden="true" /> :
    <Sun className="w-4 h-4" aria-hidden="true" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9"
          aria-label="Toggle theme"
        >
          {currentIcon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === option.value && 'bg-primary-50 dark:bg-primary-900'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {theme === option.value && (
              <span className="ml-auto text-primary-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
