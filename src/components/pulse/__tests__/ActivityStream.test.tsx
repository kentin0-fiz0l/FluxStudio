import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { ActivityStream } from '../ActivityStream'
import type { ActivityItem } from '@/hooks/project/useProjectPulse'

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return { ...actual }
})

function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 'act-1',
    type: 'message',
    title: 'New message posted',
    description: 'Hello from the team',
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
    actorName: 'Alice',
    projectId: 'proj-1',
    ...overrides,
  }
}

describe('ActivityStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows empty state "No recent activity" when items empty', () => {
    render(<ActivityStream items={[]} />)
    expect(screen.getByText('No recent activity')).toBeDefined()
  })

  test('renders activity items with title', () => {
    const items = [makeActivity({ title: 'Design file updated' })]
    render(<ActivityStream items={items} />)
    expect(screen.getByText('Design file updated')).toBeDefined()
  })

  test('shows description text', () => {
    const items = [makeActivity({ description: 'Updated the header layout' })]
    render(<ActivityStream items={items} />)
    expect(screen.getByText('Updated the header layout')).toBeDefined()
  })

  test('shows actor name', () => {
    const items = [makeActivity({ actorName: 'Bob' })]
    render(<ActivityStream items={items} />)
    expect(screen.getByText('by Bob')).toBeDefined()
  })

  test('respects maxItems limit', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeActivity({ id: `act-${i}`, title: `Activity ${i}` })
    )
    render(<ActivityStream items={items} maxItems={3} />)
    expect(screen.getByText('Activity 0')).toBeDefined()
    expect(screen.getByText('Activity 2')).toBeDefined()
    expect(screen.queryByText('Activity 3')).toBeNull()
  })

  test('shows "+X more" when items exceed maxItems', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeActivity({ id: `act-${i}`, title: `Activity ${i}` })
    )
    render(<ActivityStream items={items} maxItems={3} />)
    expect(screen.getByText('+2 more')).toBeDefined()
  })

  test('shows "just now" for very recent timestamps', () => {
    const items = [makeActivity({ timestamp: new Date() })]
    render(<ActivityStream items={items} />)
    expect(screen.getByText('just now')).toBeDefined()
  })
})
