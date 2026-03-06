import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { PulsePanel } from '../PulsePanel'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockPulseData = {
  activityStream: [],
  attentionItems: [],
  teamMembers: [],
  unseenCount: 0,
  isLoading: false,
  error: null,
  isAvailable: true,
  refresh: vi.fn(),
  markAllSeen: vi.fn(),
  getAttentionByType: vi.fn().mockReturnValue([]),
}
vi.mock('@/hooks/useProjectPulse', () => ({
  useProjectPulse: () => mockPulseData,
}))

const mockUseActiveProject = vi.fn()
vi.mock('@/store', () => ({
  useActiveProject: () => mockUseActiveProject(),
}))

vi.mock('../ActivityStream', () => ({
  ActivityStream: () => <div data-testid="activity-stream">ActivityStream</div>,
}))
vi.mock('../AttentionInbox', () => ({
  AttentionInbox: () => <div data-testid="attention-inbox">AttentionInbox</div>,
}))
vi.mock('../TeamHeartbeat', () => ({
  TeamHeartbeat: () => <div data-testid="team-heartbeat">TeamHeartbeat</div>,
}))

describe('PulsePanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveProject.mockReturnValue({
      activeProject: null,
      hasFocus: false,
    })
    mockPulseData.unseenCount = 0
    mockPulseData.attentionItems = []
    mockPulseData.isLoading = false
  })

  test('returns null when isOpen is false', () => {
    const { container } = render(<PulsePanel {...defaultProps} isOpen={false} />)
    expect(container.innerHTML).toBe('')
  })

  test('renders "Project Pulse" header when open', () => {
    render(<PulsePanel {...defaultProps} />)
    expect(screen.getByText('Project Pulse')).toBeDefined()
  })

  test('shows unseen count badge', () => {
    mockPulseData.unseenCount = 5
    render(<PulsePanel {...defaultProps} />)
    expect(screen.getByText('5 new')).toBeDefined()
  })

  test('tab buttons render (Needs Attention, Activity, Team)', () => {
    render(<PulsePanel {...defaultProps} />)
    expect(screen.getByText('Needs Attention')).toBeDefined()
    expect(screen.getByText('Activity')).toBeDefined()
    expect(screen.getByText('Team')).toBeDefined()
  })

  test('clicking tab switches content', async () => {
    const { user } = render(<PulsePanel {...defaultProps} />)
    // Initially shows attention inbox
    expect(screen.getByTestId('attention-inbox')).toBeDefined()

    // Click Activity tab
    await user.click(screen.getByText('Activity'))
    expect(screen.getByTestId('activity-stream')).toBeDefined()

    // Click Team tab
    await user.click(screen.getByText('Team'))
    expect(screen.getByTestId('team-heartbeat')).toBeDefined()
  })

  test('refresh button calls refresh', async () => {
    const { user } = render(<PulsePanel {...defaultProps} />)
    const refreshBtn = screen.getByLabelText('Refresh pulse')
    await user.click(refreshBtn)
    expect(mockPulseData.refresh).toHaveBeenCalledOnce()
  })

  test('close button calls onClose', async () => {
    const onClose = vi.fn()
    const { user } = render(<PulsePanel {...defaultProps} onClose={onClose} />)
    const closeBtn = screen.getByLabelText('Close pulse panel')
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('shows project name when activeProject exists', () => {
    mockUseActiveProject.mockReturnValue({
      activeProject: { id: 'p1', name: 'My Project' },
      hasFocus: true,
    })
    render(<PulsePanel {...defaultProps} />)
    expect(screen.getByText('My Project')).toBeDefined()
  })

  test('shows "All caught up!" footer when no attention items on attention tab', () => {
    mockPulseData.attentionItems = []
    render(<PulsePanel {...defaultProps} />)
    expect(screen.getByText('All caught up!')).toBeDefined()
  })

  test('shows loading state on refresh button', () => {
    mockPulseData.isLoading = true
    render(<PulsePanel {...defaultProps} />)
    const refreshBtn = screen.getByLabelText('Refresh pulse')
    expect(refreshBtn.hasAttribute('disabled')).toBe(true)
  })
})
