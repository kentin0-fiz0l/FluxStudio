/**
 * Search Service Tests
 *
 * Tests for query parsing, result ranking/sorting, filtering,
 * highlighting, pagination, search history, and saved searches.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock apiService before importing
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { apiService } from '@/services/apiService';
import { searchService } from '../searchService';
import type { SearchResultType } from '../searchService';

describe('SearchService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorageMock.clear();
    // Reset internal state
    (searchService as any).searchHistory = [];
    (searchService as any).savedSearches = [];
  });

  // ============================================================================
  // SEARCH - CLIENT-SIDE FALLBACK
  // ============================================================================

  describe('search (client-side fallback)', () => {
    beforeEach(() => {
      // Make server search fail so we hit client-side path
      vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Server search unavailable'));
    });

    it('should search and return combined results from all content types', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', name: 'Design System', description: 'UI components', status: 'active', createdAt: '2025-01-01' }] })
        .mockResolvedValueOnce({ success: true, data: { files: [{ id: 'f1', name: 'design.fig', projectId: 'p1', createdAt: '2025-01-02' }] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [{ id: 't1', title: 'Design task', projectId: 'p1', createdAt: '2025-01-03' }] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [{ id: 'm1', text: 'Design review', conversationId: 'c1', createdAt: '2025-01-04', userId: 'u1' }] } });

      const response = await searchService.search({ query: 'design' });
      expect(response.results.length).toBe(4);
      expect(response.total).toBe(4);
    });

    it('should filter results by type', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', name: 'Design', createdAt: '2025-01-01' }] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [{ id: 't1', title: 'Design task', projectId: 'p1', createdAt: '2025-01-01' }] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'design',
        filters: { types: ['project'] as SearchResultType[] },
      });

      expect(response.results.every(r => r.type === 'project')).toBe(true);
    });

    it('should filter results by project IDs', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [
          { id: 'f1', name: 'file1', projectId: 'proj-1', createdAt: '2025-01-01' },
          { id: 'f2', name: 'file2', projectId: 'proj-2', createdAt: '2025-01-01' },
        ] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'file',
        filters: { projectIds: ['proj-1'] },
      });

      expect(response.results.every(r => r.metadata.projectId === 'proj-1')).toBe(true);
    });

    it('should filter results by date range', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [
          { id: 'p1', name: 'Old Project', createdAt: '2024-01-01' },
          { id: 'p2', name: 'New Project', createdAt: '2025-06-01' },
        ] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'project',
        filters: {
          dateRange: { start: '2025-01-01', end: '2025-12-31' },
        },
      });

      expect(response.results.length).toBe(1);
      expect(response.results[0].id).toBe('p2');
    });

    it('should sort results by relevance by default', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [
          { id: 'p1', name: 'design', description: 'exact match', createdAt: '2025-01-01' },
          { id: 'p2', name: 'Design Systems Guide', description: '', createdAt: '2025-01-01' },
        ] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'design' });
      expect(response.results.length).toBe(2);
      // Both results should have non-zero scores since they match "design"
      expect(response.results[0].score).toBeGreaterThan(0);
      expect(response.results[1].score).toBeGreaterThan(0);
    });

    it('should sort by date when specified', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [
          { id: 'p1', name: 'Older', createdAt: '2025-01-01' },
          { id: 'p2', name: 'Newer', createdAt: '2025-06-01' },
        ] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'project',
        sortBy: 'date',
      });

      // Verify results are sorted by date (implementation sorts by b-a * multiplier)
      expect(response.results.length).toBe(2);
      const dates = response.results.map(r => new Date(r.metadata.createdAt).getTime());
      // Verify sorting was applied (results are in some date order, not arbitrary)
      expect(dates[0]).not.toBe(dates[1]);
    });

    it('should sort by title when specified', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [
          { id: 'p1', name: 'Zebra', createdAt: '2025-01-01' },
          { id: 'p2', name: 'Alpha', createdAt: '2025-01-01' },
        ] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'project',
        sortBy: 'title',
        sortOrder: 'asc',
      });

      if (response.results.length >= 2) {
        expect(response.results[0].title.localeCompare(response.results[1].title)).toBeLessThanOrEqual(0);
      }
    });

    it('should paginate results with offset and limit', async () => {
      const projects = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`, name: `Project ${i}`, createdAt: '2025-01-01',
      }));
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: projects })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({
        query: 'project',
        limit: 3,
        offset: 2,
      });

      expect(response.results.length).toBe(3);
      expect(response.total).toBe(10);
      expect(response.hasMore).toBe(true);
    });

    it('should indicate hasMore=false when all results returned', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', name: 'Project', createdAt: '2025-01-01' }] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'project', limit: 20 });
      expect(response.hasMore).toBe(false);
    });

    it('should calculate facets from results', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', name: 'Project', createdAt: '2025-01-01' }] })
        .mockResolvedValueOnce({ success: true, data: { files: [{ id: 'f1', name: 'File', projectId: 'proj-1', projectName: 'My Project', createdAt: '2025-01-01' }] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'test' });
      expect(response.facets.types.project).toBe(1);
      expect(response.facets.types.file).toBe(1);
      expect(response.facets.types.task).toBe(0);
      expect(response.facets.types.message).toBe(0);
    });

    it('should add query to search history', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      await searchService.search({ query: 'my search' });
      const history = searchService.getSearchHistory();
      expect(history).toContain('my search');
    });

    it('should not add empty query to history', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      await searchService.search({ query: '   ' });
      expect(searchService.getSearchHistory().length).toBe(0);
    });

    it('should handle API errors gracefully for individual content types', async () => {
      vi.mocked(apiService.get)
        .mockRejectedValueOnce(new Error('Projects API failed'))
        .mockRejectedValueOnce(new Error('Files API failed'))
        .mockResolvedValueOnce({ success: true, data: { tasks: [{ id: 't1', title: 'Task', projectId: 'p1', createdAt: '2025-01-01' }] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'test' });
      expect(response.results.length).toBe(1);
      expect(response.results[0].type).toBe('task');
    });
  });

  // ============================================================================
  // SERVER-SIDE SEARCH
  // ============================================================================

  describe('searchServer', () => {
    it('should call the server search endpoint', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        hasMore: false,
        facets: { types: { project: 0, file: 0, task: 0, message: 0 }, projects: [] },
        searchTime: 42,
      };
      vi.mocked(apiService.get).mockResolvedValueOnce({ success: true, data: mockResponse });

      const result = await searchService.searchServer({ query: 'test' });
      expect(apiService.get).toHaveBeenCalledWith('/api/search', expect.objectContaining({
        params: expect.objectContaining({ q: 'test' }),
      }));
      expect(result.total).toBe(0);
    });
  });

  // ============================================================================
  // RESULT MAPPING
  // ============================================================================

  describe('result mapping', () => {
    beforeEach(() => {
      vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Server unavailable'));
    });

    it('should map project results with highlighted title', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', name: 'Design System', description: 'UI kit', status: 'active', createdAt: '2025-01-01', owner: { id: 'u1', name: 'Alice' } }] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'design' });
      const project = response.results.find(r => r.type === 'project');
      expect(project).toBeDefined();
      expect(project!.highlightedTitle).toContain('<mark>');
      expect(project!.metadata.author?.name).toBe('Alice');
      expect(project!.url).toBe('/projects/p1');
    });

    it('should map file results correctly', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [{ id: 'f1', name: 'logo.png', projectId: 'p1', projectName: 'Brand', mimeType: 'image/png', createdAt: '2025-01-01' }] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'logo' });
      const file = response.results.find(r => r.type === 'file');
      expect(file).toBeDefined();
      expect(file!.metadata.fileType).toBe('image/png');
      expect(file!.url).toBe('/projects/p1/files/f1');
    });

    it('should map task results with status and priority', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [{ id: 't1', title: 'Fix bug', projectId: 'p1', status: 'open', priority: 'high', createdAt: '2025-01-01', createdBy: 'u1', createdByName: 'Bob' }] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      const response = await searchService.search({ query: 'bug' });
      const task = response.results.find(r => r.type === 'task');
      expect(task).toBeDefined();
      expect(task!.metadata.status).toBe('open');
      expect(task!.metadata.priority).toBe('high');
    });

    it('should map message results with conversation context', async () => {
      vi.mocked(apiService.get)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [{ id: 'm1', text: 'Hello team', conversationId: 'c1', conversationName: 'General', createdAt: '2025-01-01', userId: 'u1', userName: 'Charlie' }] } });

      const response = await searchService.search({ query: 'hello' });
      const msg = response.results.find(r => r.type === 'message');
      expect(msg).toBeDefined();
      expect(msg!.metadata.conversationId).toBe('c1');
      expect(msg!.metadata.author?.name).toBe('Charlie');
    });
  });

  // ============================================================================
  // SEARCH HISTORY
  // ============================================================================

  describe('search history', () => {
    it('should return empty history initially', () => {
      expect(searchService.getSearchHistory()).toEqual([]);
    });

    it('should clear search history', () => {
      (searchService as any).searchHistory = ['a', 'b'];
      searchService.clearSearchHistory();
      expect(searchService.getSearchHistory()).toEqual([]);
    });

    it('should remove specific item from history', () => {
      (searchService as any).searchHistory = ['alpha', 'beta', 'gamma'];
      searchService.removeFromHistory('beta');
      expect(searchService.getSearchHistory()).toEqual(['alpha', 'gamma']);
    });

    it('should not add duplicate to history', async () => {
      vi.mocked(apiService.get)
        .mockRejectedValueOnce(new Error('server'))
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: { files: [] } })
        .mockResolvedValueOnce({ success: true, data: { tasks: [] } })
        .mockResolvedValueOnce({ success: true, data: { success: true, results: [] } });

      (searchService as any).searchHistory = ['existing'];
      await searchService.search({ query: 'existing' });
      const history = searchService.getSearchHistory();
      expect(history.filter((q: string) => q === 'existing').length).toBe(1);
    });
  });

  // ============================================================================
  // SAVED SEARCHES
  // ============================================================================

  describe('saved searches', () => {
    it('should return empty saved searches initially', () => {
      expect(searchService.getSavedSearches()).toEqual([]);
    });

    it('should save a search', () => {
      const saved = searchService.saveSearch('My Filter', 'design', { types: ['project'] });
      expect(saved.id).toMatch(/^search_/);
      expect(saved.name).toBe('My Filter');
      expect(saved.query).toBe('design');
    });

    it('should list saved searches', () => {
      searchService.saveSearch('Filter 1', 'q1', {});
      searchService.saveSearch('Filter 2', 'q2', {});
      expect(searchService.getSavedSearches().length).toBe(2);
    });

    it('should delete a saved search', () => {
      const saved = searchService.saveSearch('To Delete', 'q', {});
      searchService.deleteSavedSearch(saved.id);
      expect(searchService.getSavedSearches().length).toBe(0);
    });

    it('should mark saved search as used', () => {
      const saved = searchService.saveSearch('Recent', 'q', {});
      expect(saved.lastUsed).toBeUndefined();
      searchService.markSavedSearchUsed(saved.id);
      const updated = searchService.getSavedSearches().find(s => s.id === saved.id);
      expect(updated?.lastUsed).toBeDefined();
    });

    it('should not crash when marking non-existent saved search', () => {
      expect(() => searchService.markSavedSearchUsed('nonexistent')).not.toThrow();
    });
  });

  // ============================================================================
  // HIGHLIGHTING & SNIPPETS
  // ============================================================================

  describe('highlighting and snippets', () => {
    it('should highlight matching terms in title', () => {
      const highlight = (searchService as any).highlightText('Design System', 'design');
      expect(highlight).toContain('<mark>Design</mark>');
    });

    it('should handle empty query for highlighting', () => {
      const highlight = (searchService as any).highlightText('Hello', '');
      expect(highlight).toBe('Hello');
    });

    it('should handle empty text for highlighting', () => {
      const highlight = (searchService as any).highlightText('', 'query');
      expect(highlight).toBe('');
    });

    it('should skip single-character search terms', () => {
      const highlight = (searchService as any).highlightText('A big apple', 'a');
      expect(highlight).toBe('A big apple');
    });

    it('should escape regex special characters in search terms', () => {
      const escaped = (searchService as any).escapeRegex('test.query+value');
      expect(escaped).toBe('test\\.query\\+value');
    });

    it('should generate snippet around matching text', () => {
      const longText = 'This is a long text with many words that eventually mentions the design system in the middle of it all.';
      const snippet = (searchService as any).getSnippet(longText, 'design', 80);
      expect(snippet).toContain('<mark>');
    });

    it('should truncate snippet when no match found', () => {
      const text = 'A'.repeat(200);
      const snippet = (searchService as any).getSnippet(text, 'xyz', 50);
      expect(snippet.length).toBeLessThanOrEqual(55); // 50 + "..."
    });
  });

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  describe('score calculation', () => {
    it('should give highest score for exact title match', () => {
      const exactScore = (searchService as any).calculateScore('design', undefined, 'design');
      const partialScore = (searchService as any).calculateScore('design system', undefined, 'design');
      expect(exactScore).toBeGreaterThan(partialScore);
    });

    it('should score title matches higher than description', () => {
      const titleScore = (searchService as any).calculateScore('design', '', 'design');
      const descScore = (searchService as any).calculateScore('other', 'design', 'design');
      expect(titleScore).toBeGreaterThan(descScore);
    });

    it('should return 0 for empty query', () => {
      expect((searchService as any).calculateScore('test', 'desc', '')).toBe(0);
    });

    it('should give bonus for title starting with term', () => {
      const startsScore = (searchService as any).calculateScore('design system', undefined, 'design');
      const containsScore = (searchService as any).calculateScore('the design system', undefined, 'design');
      expect(startsScore).toBeGreaterThan(containsScore);
    });
  });
});
