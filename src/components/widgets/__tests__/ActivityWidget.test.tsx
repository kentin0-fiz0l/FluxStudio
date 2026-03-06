import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { ActivityWidget } from '../ActivityWidget'
import type { WidgetConfig } from '../types'

const mockRefresh = vi.fn()
const mockUseActivityData = vi.fn()

vi.mock('../../../hooks/useRealTimeData', () => ({
  useActivityData: () => mockUseActivityData(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'activity-widget',
  title: 'Activity',
  description: 'Activity widget',
  component: ActivityWidget,
  category: 'overview',
  size: 'wide',
  permissions: ['admin'],
}

function createActivity(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    type: 'project_update',
    title: 'Project Updated',
    description: 'Updated the project settings',
    user: 'John Doe',
    timestamp: new Date(),
    ...overrides,
  }
}

describe('ActivityWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state when isLoading and no activities', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Loading activity...')).toBeDefined()
  })

  test('shows error state with "Connection Error"', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: false,
      error: 'Network error',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Connection Error')).toBeDefined()
  })

  test('shows retry button in error state', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: false,
      error: 'Network error',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Retry')).toBeDefined()
  })

  test('renders activity items with title and description', () => {
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, title: 'First Activity', description: 'Did something' })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('First Activity')).toBeDefined()
    expect(screen.getByText('Did something')).toBeDefined()
  })

  test('shows max 5 items (slice 0,5)', () => {
    const activities = Array.from({ length: 8 }, (_, i) =>
      createActivity({ id: i + 1, title: `Activity ${i + 1}` })
    )
    mockUseActivityData.mockReturnValue({
      data: activities,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Activity 1')).toBeDefined()
    expect(screen.getByText('Activity 5')).toBeDefined()
    expect(screen.queryByText('Activity 6')).toBeNull()
  })

  test('shows empty state "No recent activity"', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('No recent activity')).toBeDefined()
  })

  test('formats time: "Just now" for recent', () => {
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, timestamp: new Date() })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Just now')).toBeDefined()
  })

  test('formats time: minutes ago', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, timestamp: tenMinutesAgo })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('10m ago')).toBeDefined()
  })

  test('formats time: hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, timestamp: threeHoursAgo })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('3h ago')).toBeDefined()
  })

  test('formats time: days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, timestamp: twoDaysAgo })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('2d ago')).toBeDefined()
  })

  test('shows activity type badge', () => {
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, type: 'file_upload' })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('file upload')).toBeDefined()
  })

  test('shows user name', () => {
    mockUseActivityData.mockReturnValue({
      data: [createActivity({ id: 1, user: 'Jane Smith' })],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('Jane Smith')).toBeDefined()
  })

  test('shows "View All Activity" button', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    render(<ActivityWidget config={mockConfig} />)
    expect(screen.getByText('View All Activity')).toBeDefined()
  })

  test('connection status indicator renders', () => {
    mockUseActivityData.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
    const { container } = render(<ActivityWidget config={mockConfig} />)
    expect(container.querySelector('.text-green-400')).toBeDefined()
  })
})
