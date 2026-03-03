/**
 * SearchResultCard Component Tests
 *
 * Tests: result types, snippet display, click handler, compact mode.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { SearchResultCard } from '../SearchResultCard';
import type { SearchResult } from '../../../services/searchService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeRichText: (html: string) => html,
}));

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'r1',
    type: 'project',
    title: 'Test Project',
    description: 'A test project description',
    score: 0.9,
    url: '/projects/r1',
    metadata: {
      createdAt: new Date().toISOString(),
      projectName: 'My Project',
    },
    ...overrides,
  };
}

describe('SearchResultCard', () => {
  test('renders result title', () => {
    render(<SearchResultCard result={makeResult()} onClick={vi.fn()} />);

    expect(screen.getByText('Test Project')).toBeTruthy();
  });

  test('renders type label', () => {
    render(<SearchResultCard result={makeResult({ type: 'task' })} onClick={vi.fn()} />);

    expect(screen.getByText('Task')).toBeTruthy();
  });

  test('renders description snippet', () => {
    render(
      <SearchResultCard
        result={makeResult({ description: 'Design mockups for sprint 5' })}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Design mockups for sprint 5')).toBeTruthy();
  });

  test('renders project context metadata', () => {
    render(
      <SearchResultCard
        result={makeResult({ metadata: { createdAt: '2025-01-01T00:00:00Z', projectName: 'Alpha' } })}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  test('calls onClick when card is clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(<SearchResultCard result={makeResult()} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('renders compact variant without description', () => {
    render(
      <SearchResultCard result={makeResult()} onClick={vi.fn()} isCompact />
    );

    // In compact mode, the result title should still appear
    expect(screen.getByText('Test Project')).toBeTruthy();
  });
});
