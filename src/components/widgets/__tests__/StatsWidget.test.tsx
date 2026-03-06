import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { StatsWidget } from '../StatsWidget'
import type { WidgetConfig } from '../types'

const mockRefresh = vi.fn()
const mockUseStatsData = vi.fn()

vi.mock('../../../hooks/useRealTimeData', () => ({
  useStatsData: () => mockUseStatsData(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'stats-widget',
  title: 'Stats',
  description: 'Stats widget',
  component: StatsWidget,
  category: 'analytics',
  size: 'medium',
  permissions: ['admin'],
}

const mockStatsData = {
  totalProjects: 25,
  activeProjects: 12,
  completedThisMonth: 5,
  teamMembers: 8,
  avgProgress: 67,
  recentActivity: 15,
}

describe('StatsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading skeleton when isLoading and no data', () => {
    mockUseStatsData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      lastUpdated: null,
      refresh: mockRefresh,
    })
    const { container } = render(<StatsWidget config={mockConfig} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  test('shows error state with "Connection Error" text', () => {
    mockUseStatsData.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Network error',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('Connection Error')).toBeDefined()
  })

  test('shows retry button in error state', () => {
    mockUseStatsData.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Network error',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('Retry')).toBeDefined()
  })

  test('renders stat values', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('25')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('8')).toBeDefined()
  })

  test('shows "No data available" when stats is null and no error', () => {
    mockUseStatsData.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('No data available')).toBeDefined()
  })

  test('shows Average Progress percentage', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('Average Progress')).toBeDefined()
    expect(screen.getByText('67%')).toBeDefined()
  })

  test('connection status shows green wifi when no error', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    const { container } = render(<StatsWidget config={mockConfig} />)
    expect(container.querySelector('.text-green-400')).toBeDefined()
  })

  test('connection status shows red wifi on error', () => {
    mockUseStatsData.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Connection lost',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    const { container } = render(<StatsWidget config={mockConfig} />)
    expect(container.querySelector('.text-red-400')).toBeDefined()
  })

  test('refresh button calls refresh', async () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    const { user } = render(<StatsWidget config={mockConfig} />)
    const refreshBtn = screen.getByLabelText('Refresh stats')
    await user.click(refreshBtn)
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  test('shows "Updating stats..." during background refresh', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: true,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('Updating stats...')).toBeDefined()
  })

  test('renders all stat labels', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('Total Projects')).toBeDefined()
    expect(screen.getByText('Active Projects')).toBeDefined()
    expect(screen.getByText('Completed This Month')).toBeDefined()
    expect(screen.getByText('Team Members')).toBeDefined()
  })

  test('shows recent activity count', () => {
    mockUseStatsData.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<StatsWidget config={mockConfig} />)
    expect(screen.getByText('15')).toBeDefined()
    expect(screen.getByText('Recent activities today')).toBeDefined()
  })
})
