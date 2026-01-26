/**
 * SearchBar Molecule - Flux Design Language
 *
 * A reusable search bar component combining Input with search functionality.
 * Supports filtering, keyboard shortcuts, and recent searches.
 *
 * @example
 * <SearchBar
 *   placeholder="Search projects..."
 *   onSearch={(query) => console.log(query)}
 * />
 */

import * as React from 'react';
import { Search, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Search callback
   */
  onSearch?: (query: string) => void;

  /**
   * Value controlled state
   */
  value?: string;

  /**
   * Change callback for controlled component
   */
  onChange?: (value: string) => void;

  /**
   * Show recent searches
   */
  showRecent?: boolean;

  /**
   * Recent searches list
   */
  recentSearches?: string[];

  /**
   * Clear recent searches callback
   */
  onClearRecent?: (search: string) => void;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom className
   */
  className?: string;

  /**
   * Auto focus on mount
   */
  autoFocus?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      placeholder = 'Search...',
      onSearch,
      value: controlledValue,
      onChange,
      showRecent = false,
      recentSearches = [],
      onClearRecent,
      size = 'md',
      className,
      autoFocus = false,
      loading = false,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState('');
    const [showDropdown, setShowDropdown] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Use controlled value if provided, otherwise internal state
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const setValue = onChange || setInternalValue;

    // Handle search submission
    const handleSearch = React.useCallback(() => {
      if (value.trim() && onSearch) {
        onSearch(value.trim());
        setShowDropdown(false);
      }
    }, [value, onSearch]);

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (showRecent && recentSearches.length > 0) {
        setShowDropdown(true);
      }
    };

    // Handle clear
    const handleClear = () => {
      setValue('');
      inputRef.current?.focus();
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };

    // Handle recent search selection
    const handleRecentClick = (search: string) => {
      setValue(search);
      setShowDropdown(false);
      if (onSearch) {
        onSearch(search);
      }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setShowDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className={cn('relative w-full', className)}>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => showRecent && recentSearches.length > 0 && setShowDropdown(true)}
          size={size}
          autoFocus={autoFocus}
