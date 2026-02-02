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
    _ref
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
          icon={loading ? <div className="animate-spin">�</div> : <Search className="h-4 w-4" />}
          iconRight={
            value ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : undefined
          }
          className="pr-10"
        />

        {/* Recent Searches Dropdown */}
        {showRecent && showDropdown && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-dropdown overflow-hidden z-50">
            <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
              Recent Searches
            </div>
            <ul className="py-1">
              {recentSearches.map((search, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleRecentClick(search)}
                    className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                  >
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <span className="flex-1">{search}</span>
                    {onClearRecent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearRecent(search);
                        }}
                        className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label={`Remove ${search}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
