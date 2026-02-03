/**
 * FluxStudio Unified Search Service
 *
 * Provides aggregated search across projects, files, tasks, and messages
 * with full-text search, filtering, and result highlighting.
 */

import { buildApiUrl } from '../config/environment';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SearchResultType = 'project' | 'file' | 'task' | 'message';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  snippet?: string;
  highlightedTitle?: string;
  highlightedDescription?: string;
  metadata: {
    projectId?: string;
    projectName?: string;
    conversationId?: string;
    conversationName?: string;
    status?: string;
    priority?: string;
    fileType?: string;
    createdAt: string;
    updatedAt?: string;
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
  };
  score: number;
  url: string;
}

export interface SearchFilters {
  types: SearchResultType[];
  projectIds: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  status: string[];
  priority: string[];
  createdBy: string[];
}

export interface SearchQuery {
  query: string;
  filters?: Partial<SearchFilters>;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  facets: {
    types: Record<SearchResultType, number>;
    projects: { id: string; name: string; count: number }[];
  };
  searchTime: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Partial<SearchFilters>;
  createdAt: string;
  lastUsed?: string;
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

class SearchService {
  private searchHistory: string[] = [];
  private readonly maxHistoryItems = 20;
  private savedSearches: SavedSearch[] = [];

  constructor() {
    this.loadSearchHistory();
    this.loadSavedSearches();
  }

  /**
   * Get auth headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Perform unified search across all content types
   */
  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const { query, filters, limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc' } = searchQuery;

    // Add to search history if not duplicate
    if (query.trim() && !this.searchHistory.includes(query.trim())) {
      this.addToHistory(query.trim());
    }

    try {
      // Parallel search across different content types
      const [projects, files, tasks, messages] = await Promise.all([
        this.searchProjects(query, filters, limit),
        this.searchFiles(query, filters, limit),
        this.searchTasks(query, filters, limit),
        this.searchMessages(query, filters, limit),
      ]);

      // Combine and score results
      let allResults: SearchResult[] = [
        ...projects,
        ...files,
        ...tasks,
        ...messages,
      ];

      // Filter by type if specified
      if (filters?.types && filters.types.length > 0) {
        allResults = allResults.filter(r => filters.types!.includes(r.type));
      }

      // Filter by project if specified
      if (filters?.projectIds && filters.projectIds.length > 0) {
        allResults = allResults.filter(r =>
          r.metadata.projectId && filters.projectIds!.includes(r.metadata.projectId)
        );
      }

      // Filter by date range
      if (filters?.dateRange?.start || filters?.dateRange?.end) {
        allResults = allResults.filter(r => {
          const date = new Date(r.metadata.createdAt);
          if (filters.dateRange?.start && date < new Date(filters.dateRange.start)) return false;
          if (filters.dateRange?.end && date > new Date(filters.dateRange.end)) return false;
          return true;
        });
      }

      // Sort results
      allResults = this.sortResults(allResults, sortBy, sortOrder);

      // Calculate facets
      const facets = this.calculateFacets(allResults);

      // Paginate
      const total = allResults.length;
      const paginatedResults = allResults.slice(offset, offset + limit);

      return {
        results: paginatedResults,
        total,
        hasMore: offset + limit < total,
        facets,
        searchTime: Date.now(),
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Search projects
   */
  private async searchProjects(
    query: string,
    filters?: Partial<SearchFilters>,
    limit = 20
  ): Promise<SearchResult[]> {
    if (filters?.types && !filters.types.includes('project')) {
      return [];
    }

    try {
      const response = await fetch(buildApiUrl(`/api/projects?search=${encodeURIComponent(query)}&limit=${limit}`), {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const projects = Array.isArray(data) ? data : data.projects || [];

      return projects.map((project: any) => this.mapProjectToResult(project, query));
    } catch {
      return [];
    }
  }

  /**
   * Search files
   */
  private async searchFiles(
    query: string,
    filters?: Partial<SearchFilters>,
    limit = 20
  ): Promise<SearchResult[]> {
    if (filters?.types && !filters.types.includes('file')) {
      return [];
    }

    try {
      const projectIds = filters?.projectIds?.join(',') || '';
      const url = buildApiUrl(`/api/files/search?q=${encodeURIComponent(query)}&limit=${limit}${projectIds ? `&projects=${projectIds}` : ''}`);
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const files = Array.isArray(data) ? data : data.files || [];

      return files.map((file: any) => this.mapFileToResult(file, query));
    } catch {
      return [];
    }
  }

  /**
   * Search tasks
   */
  private async searchTasks(
    query: string,
    filters?: Partial<SearchFilters>,
    limit = 20
  ): Promise<SearchResult[]> {
    if (filters?.types && !filters.types.includes('task')) {
      return [];
    }

    try {
      const projectIds = filters?.projectIds?.join(',') || '';
      const url = buildApiUrl(`/api/tasks/search?q=${encodeURIComponent(query)}&limit=${limit}${projectIds ? `&projects=${projectIds}` : ''}`);
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const tasks = Array.isArray(data) ? data : data.tasks || [];

      return tasks.map((task: any) => this.mapTaskToResult(task, query));
    } catch {
      return [];
    }
  }

  /**
   * Search messages
   */
  private async searchMessages(
    query: string,
    filters?: Partial<SearchFilters>,
    limit = 20
  ): Promise<SearchResult[]> {
    if (filters?.types && !filters.types.includes('message')) {
      return [];
    }

    try {
      const url = buildApiUrl(`/api/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const messages = data.success ? data.results || [] : [];

      return messages.map((message: any) => this.mapMessageToResult(message, query));
    } catch {
      return [];
    }
  }

  /**
   * Map project to search result
   */
  private mapProjectToResult(project: any, query: string): SearchResult {
    return {
      id: project.id,
      type: 'project',
      title: project.name,
      description: project.description,
      highlightedTitle: this.highlightText(project.name, query),
      highlightedDescription: project.description ? this.highlightText(project.description, query) : undefined,
      metadata: {
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        author: project.owner ? {
          id: project.owner.id,
          name: project.owner.name,
          avatar: project.owner.avatar,
        } : undefined,
      },
      score: this.calculateScore(project.name, project.description, query),
      url: `/projects/${project.id}`,
    };
  }

  /**
   * Map file to search result
   */
  private mapFileToResult(file: any, query: string): SearchResult {
    return {
      id: file.id,
      type: 'file',
      title: file.name,
      description: file.description,
      highlightedTitle: this.highlightText(file.name, query),
      snippet: file.snippet ? this.highlightText(file.snippet, query) : undefined,
      metadata: {
        projectId: file.projectId,
        projectName: file.projectName,
        fileType: file.mimeType || file.type,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        author: file.uploadedBy ? {
          id: file.uploadedBy.id,
          name: file.uploadedBy.name,
          avatar: file.uploadedBy.avatar,
        } : undefined,
      },
      score: this.calculateScore(file.name, file.description, query),
      url: `/projects/${file.projectId}/files/${file.id}`,
    };
  }

  /**
   * Map task to search result
   */
  private mapTaskToResult(task: any, query: string): SearchResult {
    return {
      id: task.id,
      type: 'task',
      title: task.title,
      description: task.description,
      highlightedTitle: this.highlightText(task.title, query),
      highlightedDescription: task.description ? this.highlightText(task.description, query) : undefined,
      metadata: {
        projectId: task.projectId,
        projectName: task.projectName,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        author: task.createdBy ? {
          id: task.createdBy.id || task.createdBy,
          name: task.createdByName || 'Unknown',
        } : undefined,
      },
      score: this.calculateScore(task.title, task.description, query),
      url: `/projects/${task.projectId}/tasks/${task.id}`,
    };
  }

  /**
   * Map message to search result
   */
  private mapMessageToResult(message: any, query: string): SearchResult {
    return {
      id: message.id,
      type: 'message',
      title: message.userName || 'Message',
      description: message.text,
      highlightedTitle: message.userName ? this.highlightText(message.userName, query) : undefined,
      highlightedDescription: message.text ? this.highlightText(message.text, query) : undefined,
      snippet: message.text ? this.getSnippet(message.text, query) : undefined,
      metadata: {
        conversationId: message.conversationId,
        conversationName: message.conversationName,
        projectId: message.projectId,
        createdAt: message.createdAt,
        author: {
          id: message.userId,
          name: message.userName || 'Unknown',
          avatar: message.userAvatar,
        },
      },
      score: this.calculateScore(message.text, '', query),
      url: `/messages/${message.conversationId}?highlight=${message.id}`,
    };
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, query: string): string {
    if (!text || !query) return text;

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    let highlighted = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  /**
   * Get snippet around search terms
   */
  private getSnippet(text: string, query: string, maxLength = 150): string {
    if (!text || !query) return text?.substring(0, maxLength) || '';

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const lowerText = text.toLowerCase();

    // Find the first matching term
    let firstMatchIndex = -1;
    for (const term of terms) {
      const index = lowerText.indexOf(term);
      if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
        firstMatchIndex = index;
      }
    }

    if (firstMatchIndex === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Extract snippet around the match
    const start = Math.max(0, firstMatchIndex - 50);
    const end = Math.min(text.length, start + maxLength);
    let snippet = text.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return this.highlightText(snippet, query);
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(title: string, description: string | undefined, query: string): number {
    if (!query) return 0;

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    let score = 0;

    const lowerTitle = (title || '').toLowerCase();
    const lowerDesc = (description || '').toLowerCase();

    terms.forEach(term => {
      // Exact title match is highest
      if (lowerTitle === term) score += 100;
      // Title contains term
      else if (lowerTitle.includes(term)) score += 50;
      // Title starts with term
      if (lowerTitle.startsWith(term)) score += 25;
      // Description contains term
      if (lowerDesc.includes(term)) score += 10;
    });

    return score;
  }

  /**
   * Sort results
   */
  private sortResults(
    results: SearchResult[],
    sortBy: 'relevance' | 'date' | 'title',
    sortOrder: 'asc' | 'desc'
  ): SearchResult[] {
    const sorted = [...results];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => (b.score - a.score) * multiplier);
        break;
      case 'date':
        sorted.sort((a, b) =>
          (new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()) * multiplier
        );
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title) * multiplier);
        break;
    }

    return sorted;
  }

  /**
   * Calculate facets for filtering
   */
  private calculateFacets(results: SearchResult[]): SearchResponse['facets'] {
    const types: Record<SearchResultType, number> = {
      project: 0,
      file: 0,
      task: 0,
      message: 0,
    };

    const projectMap = new Map<string, { id: string; name: string; count: number }>();

    results.forEach(result => {
      types[result.type]++;

      if (result.metadata.projectId && result.metadata.projectName) {
        const existing = projectMap.get(result.metadata.projectId);
        if (existing) {
          existing.count++;
        } else {
          projectMap.set(result.metadata.projectId, {
            id: result.metadata.projectId,
            name: result.metadata.projectName,
            count: 1,
          });
        }
      }
    });

    return {
      types,
      projects: Array.from(projectMap.values()).sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ============================================================================
  // SEARCH HISTORY
  // ============================================================================

  /**
   * Load search history from localStorage
   */
  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('flux_search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch {
      this.searchHistory = [];
    }
  }

  /**
   * Save search history to localStorage
   */
  private saveSearchHistory(): void {
    try {
      localStorage.setItem('flux_search_history', JSON.stringify(this.searchHistory));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    // Remove if exists and add to front
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    this.searchHistory.unshift(query);

    // Trim to max items
    if (this.searchHistory.length > this.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
    }

    this.saveSearchHistory();
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  /**
   * Remove item from search history
   */
  removeFromHistory(query: string): void {
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    this.saveSearchHistory();
  }

  // ============================================================================
  // SAVED SEARCHES
  // ============================================================================

  /**
   * Load saved searches from localStorage
   */
  private loadSavedSearches(): void {
    try {
      const stored = localStorage.getItem('flux_saved_searches');
      if (stored) {
        this.savedSearches = JSON.parse(stored);
      }
    } catch {
      this.savedSearches = [];
    }
  }

  /**
   * Save searches to localStorage
   */
  private saveSavedSearches(): void {
    try {
      localStorage.setItem('flux_saved_searches', JSON.stringify(this.savedSearches));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Get saved searches
   */
  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches];
  }

  /**
   * Save a search
   */
  saveSearch(name: string, query: string, filters: Partial<SearchFilters>): SavedSearch {
    const savedSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name,
      query,
      filters,
      createdAt: new Date().toISOString(),
    };

    this.savedSearches.push(savedSearch);
    this.saveSavedSearches();

    return savedSearch;
  }

  /**
   * Delete a saved search
   */
  deleteSavedSearch(id: string): void {
    this.savedSearches = this.savedSearches.filter(s => s.id !== id);
    this.saveSavedSearches();
  }

  /**
   * Update last used time for saved search
   */
  markSavedSearchUsed(id: string): void {
    const search = this.savedSearches.find(s => s.id === id);
    if (search) {
      search.lastUsed = new Date().toISOString();
      this.saveSavedSearches();
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
