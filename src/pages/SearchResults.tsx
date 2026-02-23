/**
 * SearchResults Page - Flux Studio
 *
 * Dedicated search results page with filters, sorting, and pagination.
 * Accessible via /search route or Cmd+K global search.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../hooks/useSearch';
import { SearchFilters } from '../components/search/SearchFilters';
import { SearchResultCard } from '../components/search/SearchResultCard';
import { SearchResultType } from '../services/searchService';
import { DashboardLayout } from '../components/templates';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  X,
  History,
  Bookmark,
  SortAsc,
  SortDesc,
  ChevronDown,
  Loader2,
  AlertCircle,
  FolderKanban,
  File,
  CheckSquare,
  MessageSquare,
  Filter,
  Trash2,
  Plus,
  Star,
} from 'lucide-react';

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchResults() {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  const {
    query,
    setQuery,
    results,
    total,
    hasMore,
    facets,
    isLoading,
    error,
    filters,
    setFilters,
    toggleTypeFilter,
    clearFilters,
    loadMore,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    searchHistory,
    clearSearchHistory,
    removeFromHistory,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    loadSavedSearch,
    clearSearch,
    navigateToResult,
    isSearchActive,
    activeFilterCount,
  } = useSearch({
    syncWithURL: true,
    pageSize: 20,
  });

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowHistoryDropdown(false);
      setShowSortDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear search
      if (e.key === 'Escape' && query) {
        e.preventDefault();
        clearSearch();
      }
      // Focus search on /
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [query, clearSearch]);

  const handleSaveSearch = useCallback(() => {
    if (saveSearchName.trim()) {
      saveCurrentSearch(saveSearchName.trim());
      setSaveSearchName('');
      setShowSaveDialog(false);
    }
  }, [saveSearchName, saveCurrentSearch]);

  const typeIcons: Record<SearchResultType, React.ReactNode> = {
    project: <FolderKanban className="w-4 h-4" aria-hidden="true" />,
    file: <File className="w-4 h-4" aria-hidden="true" />,
    task: <CheckSquare className="w-4 h-4" aria-hidden="true" />,
    message: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
  };

  // Build breadcrumbs - show query if present
  const breadcrumbs = query.trim()
    ? [{ label: 'Search' }, { label: `"${query}"` }]
    : [{ label: 'Search' }];

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={breadcrumbs}
      onLogout={logout}
    >
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Search Input */}
          <div className="relative max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder', 'Search projects, files, tasks, and messages...')}
                className="w-full pl-12 pr-32 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {query && (
                  <button
                    onClick={clearSearch}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && showHistoryDropdown) {
                        e.stopPropagation();
                        setShowHistoryDropdown(false);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                    title={t('search.history', 'Search History')}
                    aria-expanded={showHistoryDropdown}
                    aria-haspopup="listbox"
                    aria-label={t('search.history', 'Search History')}
                  >
                    <History className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* History Dropdown */}
                  {showHistoryDropdown && (
                    <div
                      role="listbox"
                      aria-label={t('search.history', 'Search History')}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setShowHistoryDropdown(false);
                        }
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          const items = e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]');
                          const focused = e.currentTarget.querySelector<HTMLElement>('[role="option"]:focus');
                          const idx = focused ? Array.from(items).indexOf(focused) : -1;
                          const next = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
                          items[next]?.focus();
                        }
                      }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                      {/* Saved Searches */}
                      {savedSearches.length > 0 && (
                        <div className="border-b border-gray-200 dark:border-gray-700">
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                            <Star className="w-3 h-3" aria-hidden="true" />
                            {t('search.savedSearches', 'Saved Searches')}
                          </div>
                          {savedSearches.slice(0, 5).map((saved) => (
                            <div
                              key={saved.id}
                              role="option"
                              tabIndex={0}
                              aria-selected={false}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  loadSavedSearch(saved);
                                  setShowHistoryDropdown(false);
                                }
                              }}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none group cursor-pointer"
                            >
                              <button
                                onClick={() => {
                                  loadSavedSearch(saved);
                                  setShowHistoryDropdown(false);
                                }}
                                tabIndex={-1}
                                className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300"
                              >
                                {saved.name}
                              </button>
                              <button
                                onClick={() => deleteSavedSearch(saved.id)}
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recent Searches */}
                      {searchHistory.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <History className="w-3 h-3" aria-hidden="true" />
                              {t('search.recentSearches', 'Recent Searches')}
                            </span>
                            <button
                              onClick={clearSearchHistory}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs normal-case"
                            >
                              {t('search.clearAll', 'Clear all')}
                            </button>
                          </div>
                          {searchHistory.slice(0, 8).map((historyQuery, index) => (
                            <div
                              key={index}
                              role="option"
                              tabIndex={0}
                              aria-selected={false}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setQuery(historyQuery);
                                  setShowHistoryDropdown(false);
                                }
                              }}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none group cursor-pointer"
                            >
                              <button
                                onClick={() => {
                                  setQuery(historyQuery);
                                  setShowHistoryDropdown(false);
                                }}
                                tabIndex={-1}
                                className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate"
                              >
                                {historyQuery}
                              </button>
                              <button
                                onClick={() => removeFromHistory(historyQuery)}
                                className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          {t('search.noHistory', 'No recent searches')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save Search */}
                {isSearchActive && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                    title={t('search.saveSearch', 'Save Search')}
                  >
                    <Bookmark className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}

                <span className="text-xs text-gray-400 hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/</kbd>
                </span>
              </div>
            </div>

            {/* Quick type filters */}
            <div className="flex items-center gap-2 mt-3">
              {(['project', 'file', 'task', 'message'] as SearchResultType[]).map((type) => {
                const isSelected = filters.types?.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    aria-pressed={!!isSelected}
                    aria-label={`Filter by ${type}s${facets?.types[type] !== undefined ? ` (${facets.types[type]} results)` : ''}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {typeIcons[type]}
                    <span className="capitalize">{type}s</span>
                    {facets?.types[type] !== undefined && (
                      <span className="text-xs opacity-75">{facets.types[type]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-72 flex-shrink-0 hidden lg:block">
              <SearchFilters
                filters={filters}
                facets={facets}
                onFilterChange={setFilters}
                onToggleType={toggleTypeFilter}
                onClearFilters={clearFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <Filter className="w-4 h-4" aria-hidden="true" />
                  {t('search.filters.title', 'Filters')}
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {isSearchActive && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading
                      ? t('search.searching', 'Searching...')
                      : t('search.resultsCount', '{{count}} results', { count: total })}
                  </span>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && showSortDropdown) {
                      e.stopPropagation();
                      setShowSortDropdown(false);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  aria-expanded={showSortDropdown}
                  aria-haspopup="listbox"
                  aria-label={t('search.sort.label', 'Sort results')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" aria-hidden="true" /> : <SortDesc className="w-4 h-4" aria-hidden="true" />}
                  <span className="capitalize">{sortBy}</span>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </button>

                {showSortDropdown && (
                  <div
                    role="listbox"
                    aria-label={t('search.sort.label', 'Sort results')}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setShowSortDropdown(false);
                      }
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const items = e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]');
                        const focused = e.currentTarget.querySelector<HTMLElement>('[role="option"]:focus');
                        const idx = focused ? Array.from(items).indexOf(focused) : -1;
                        const next = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
                        items[next]?.focus();
                      }
                    }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    {(['relevance', 'date', 'title'] as const).map((option) => (
                      <button
                        key={option}
                        role="option"
                        aria-selected={sortBy === option}
                        onClick={() => {
                          setSortBy(option);
                          setShowSortDropdown(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSortBy(option);
                            setShowSortDropdown(false);
                          }
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none ${
                          sortBy === option ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {t(`search.sort.${option}`, option.charAt(0).toUpperCase() + option.slice(1))}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700" />
                    <button
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        setShowSortDropdown(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          setShowSortDropdown(false);
                        }
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      {sortOrder === 'asc' ? <SortDesc className="w-4 h-4" aria-hidden="true" /> : <SortAsc className="w-4 h-4" aria-hidden="true" />}
                      {sortOrder === 'asc' ? t('search.sort.descending', 'Descending') : t('search.sort.ascending', 'Ascending')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Results List */}
            {error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            ) : !isSearchActive ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('search.emptyState.title', 'Search your workspace')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t('search.emptyState.description', 'Find projects, files, tasks, and messages across your entire workspace.')}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Press</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + K
                  </kbd>
                  <span>anywhere to search</span>
                </div>
              </div>
            ) : isLoading && results.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" aria-hidden="true" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('search.noResults.title', 'No results found')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('search.noResults.description', 'Try different keywords or adjust your filters.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <SearchResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onClick={() => navigateToResult(result)}
                  />
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          {t('search.loading', 'Loading...')}
                        </span>
                      ) : (
                        t('search.loadMore', 'Load more results')
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('search.saveSearch', 'Save Search')}
            </h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder={t('search.saveSearchPlaceholder', 'Enter a name for this search...')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSearch();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                {t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

export default SearchResults;
