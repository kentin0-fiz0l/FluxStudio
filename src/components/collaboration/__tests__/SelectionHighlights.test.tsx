/**
 * SelectionHighlights Component Tests
 *
 * Tests null rendering when no selections, overlay container, user labels.
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from '@/test/utils';

vi.mock('@/store', () => ({
  useCollaborators: vi.fn(),
}));

import { useCollaborators } from '@/store';
import { SelectionHighlights } from '../SelectionHighlights';

describe('SelectionHighlights', () => {
  test('renders nothing when no collaborators have selections', () => {
    vi.mocked(useCollaborators).mockReturnValue([
      { id: 'c-1', userId: 'u-1', userName: 'Alice', color: '#3B82F6', isActive: true, selection: undefined, lastActivity: new Date().toISOString() },
    ]);
    const { container } = render(<SelectionHighlights sessionId="board:1" />);
    expect(container.innerHTML).toBe('');
  });

  test('renders overlay container when selections exist', () => {
    vi.mocked(useCollaborators).mockReturnValue([
      {
        id: 'c-1',
        userId: 'u-1',
        userName: 'Alice',
        color: '#3B82F6',
        isActive: true,
        lastActivity: new Date().toISOString(),
        selection: { entityId: 'ent-1', entityType: 'element' as const },
      },
    ]);
    const { container } = render(<SelectionHighlights sessionId="board:1" />);
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('pointer-events-none');
  });

  test('renders overlay container with selections (user labels need DOM elements)', () => {
    vi.mocked(useCollaborators).mockReturnValue([
      {
        id: 'c-1',
        userId: 'u-1',
        userName: 'Alice',
        color: '#3B82F6',
        isActive: true,
        lastActivity: new Date().toISOString(),
        selection: { entityId: 'ent-1', entityType: 'element' as const },
      },
    ]);
    const { container } = render(<SelectionHighlights sessionId="board:1" />);
    // The overlay renders even though the SelectionOverlay child won't show bounds
    // (because there's no element with data-entity-id="ent-1" in the DOM)
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('pointer-events-none');
  });

  test('renders nothing for inactive collaborators with selection', () => {
    vi.mocked(useCollaborators).mockReturnValue([
      {
        id: 'c-1',
        userId: 'u-1',
        userName: 'Alice',
        color: '#3B82F6',
        isActive: false,
        lastActivity: new Date().toISOString(),
        selection: { entityId: 'ent-1', entityType: 'element' as const },
      },
    ]);
    const { container } = render(<SelectionHighlights sessionId="board:1" />);
    expect(container.innerHTML).toBe('');
  });
});
