import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { TeamHeartbeat } from '../TeamHeartbeat'
import type { TeamMember } from '@/hooks/useProjectPulse'

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return { ...actual }
})

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'member-1',
    name: 'Alice Johnson',
    isOnline: true,
    ...overrides,
  }
}

describe('TeamHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows empty state "No team members" when members empty', () => {
    render(<TeamHeartbeat members={[]} />)
    expect(screen.getByText('No team members')).toBeDefined()
  })

  test('renders member names', () => {
    const members = [
      makeMember({ id: '1', name: 'Alice' }),
      makeMember({ id: '2', name: 'Bob' }),
    ]
    render(<TeamHeartbeat members={members} />)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
  })

  test('shows "online" text for online members', () => {
    const members = [makeMember({ isOnline: true })]
    render(<TeamHeartbeat members={members} />)
    expect(screen.getByText('online')).toBeDefined()
  })

  test('shows online indicator dot with green class', () => {
    const members = [makeMember({ isOnline: true })]
    const { container } = render(<TeamHeartbeat members={members} />)
    const greenDot = container.querySelector('.bg-green-500')
    expect(greenDot).toBeDefined()
  })

  test('shows member count summary "X team members"', () => {
    const members = [
      makeMember({ id: '1' }),
      makeMember({ id: '2' }),
      makeMember({ id: '3' }),
    ]
    render(<TeamHeartbeat members={members} />)
    expect(screen.getByText('3 team members')).toBeDefined()
  })

  test('shows "X online" count', () => {
    const members = [
      makeMember({ id: '1', isOnline: true }),
      makeMember({ id: '2', isOnline: false }),
    ]
    render(<TeamHeartbeat members={members} />)
    expect(screen.getByText('1 online')).toBeDefined()
  })

  test('shows initials when no avatar', () => {
    const members = [makeMember({ name: 'Alice Johnson', avatar: undefined })]
    render(<TeamHeartbeat members={members} />)
    expect(screen.getByText('AJ')).toBeDefined()
  })

  test('renders avatar img when avatar URL provided', () => {
    const members = [makeMember({ avatar: 'https://example.com/alice.png' })]
    render(<TeamHeartbeat members={members} />)
    const img = screen.getByAltText('Alice Johnson')
    expect(img).toBeDefined()
    expect(img.getAttribute('src')).toBe('https://example.com/alice.png')
  })
})
