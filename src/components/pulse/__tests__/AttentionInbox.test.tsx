import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { AttentionInbox } from '../AttentionInbox'
import type { AttentionItem } from '@/hooks/project/useProjectPulse'

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return { ...actual }
})

function makeItem(overrides: Partial<AttentionItem> = {}): AttentionItem {
  return {
    id: 'item-1',
    type: 'mention',
    title: 'Test Mention',
    description: 'Someone mentioned you',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    priority: 'medium',
    projectId: 'proj-1',
    ...overrides,
  }
}

describe('AttentionInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows empty state "All caught up!" when items empty', () => {
    render(<AttentionInbox items={[]} />)
    expect(screen.getByText('All caught up!')).toBeDefined()
  })

  test('renders items with title', () => {
    const items = [makeItem({ title: 'Review PR #42' })]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('Review PR #42')).toBeDefined()
  })

  test('shows priority badge for urgent items', () => {
    const items = [makeItem({ priority: 'urgent' })]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('urgent')).toBeDefined()
  })

  test('shows priority badge for high items', () => {
    const items = [makeItem({ priority: 'high' })]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('high')).toBeDefined()
  })

  test('shows type label (Mention, Task, Reply, Approval)', () => {
    const items = [
      makeItem({ id: '1', type: 'mention' }),
      makeItem({ id: '2', type: 'assigned_task' }),
      makeItem({ id: '3', type: 'reply' }),
      makeItem({ id: '4', type: 'approval' }),
    ]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('Mention')).toBeDefined()
    expect(screen.getByText('Task')).toBeDefined()
    expect(screen.getByText('Reply')).toBeDefined()
    expect(screen.getByText('Approval')).toBeDefined()
  })

  test('shows relative time format', () => {
    const items = [makeItem({ timestamp: new Date(Date.now() - 3 * 60 * 1000) })]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('3m')).toBeDefined()
  })

  test('item with actionUrl renders as Link', () => {
    const items = [makeItem({ actionUrl: '/projects/p1/tasks' })]
    render(<AttentionInbox items={items} />)
    const link = screen.getByText('Test Mention').closest('a')
    expect(link).toBeDefined()
    expect(link?.getAttribute('href')).toBe('/projects/p1/tasks')
  })

  test('summary header shows counts by type', () => {
    const items = [
      makeItem({ id: '1', type: 'mention' }),
      makeItem({ id: '2', type: 'mention' }),
      makeItem({ id: '3', type: 'assigned_task' }),
    ]
    render(<AttentionInbox items={items} />)
    expect(screen.getByText('2 messages')).toBeDefined()
    expect(screen.getByText('1 task')).toBeDefined()
  })
})
