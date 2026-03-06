import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { PulseIndicator } from '../PulseIndicator'

const mockPulseData = {
  unseenCount: 0,
  isAvailable: true,
  attentionItems: [] as { id: string }[],
  activityStream: [],
  teamMembers: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  markAllSeen: vi.fn(),
  getAttentionByType: vi.fn().mockReturnValue([]),
}

vi.mock('@/hooks/useProjectPulse', () => ({
  useProjectPulse: () => mockPulseData,
}))

describe('PulseIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPulseData.unseenCount = 0
    mockPulseData.isAvailable = true
    mockPulseData.attentionItems = []
  })

  test('returns null when isAvailable is false', () => {
    mockPulseData.isAvailable = false
    const { container } = render(<PulseIndicator />)
    expect(container.innerHTML).toBe('')
  })

  test('shows "Pulse" text when no unseen items', () => {
    render(<PulseIndicator />)
    expect(screen.getByText('Pulse')).toBeDefined()
  })

  test('shows count when unseenCount > 0', () => {
    mockPulseData.unseenCount = 5
    render(<PulseIndicator />)
    expect(screen.getByText('5 new')).toBeDefined()
  })

  test('shows "99+" when count exceeds 99', () => {
    mockPulseData.unseenCount = 150
    render(<PulseIndicator />)
    expect(screen.getByText('99+ new')).toBeDefined()
  })

  test('click calls onClick', async () => {
    const onClick = vi.fn()
    const { user } = render(<PulseIndicator onClick={onClick} />)
    await user.click(screen.getByText('Pulse'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('shows aria-label with count', () => {
    mockPulseData.unseenCount = 3
    mockPulseData.attentionItems = [{ id: '1' }] as never[]
    render(<PulseIndicator />)
    const button = screen.getByLabelText(
      '3 new updates in project. 1 items need your attention.'
    )
    expect(button).toBeDefined()
  })
})
