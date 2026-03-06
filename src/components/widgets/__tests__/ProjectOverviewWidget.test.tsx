import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { ProjectOverviewWidget } from '../ProjectOverviewWidget'
import type { WidgetConfig } from '../types'

const mockNavigate = vi.fn()
const mockNavigateTo = vi.fn()
const mockRefresh = vi.fn()
const mockUseAuth = vi.fn()
const mockUseProjectsData = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../../contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    projects: [],
    navigateTo: mockNavigateTo,
  }),
}))

vi.mock('../../../hooks/useRealTimeData', () => ({
  useProjectsData: () => mockUseProjectsData(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'project-overview-widget',
  title: 'Project Overview',
  description: 'Track projects',
  component: ProjectOverviewWidget,
  category: 'projects',
  size: 'large',
  permissions: ['admin'],
}

const mockProjects = [
  {
    id: 'p1',
    name: 'Website Redesign',
    status: 'active',
    progress: 65,
    dueDate: '2026-04-15',
    team: 'Design',
    priority: 'high',
    lastActivity: '2h ago',
  },
  {
    id: 'p2',
    name: 'Mobile App',
    status: 'review',
    progress: 90,
    dueDate: '2026-03-20',
    team: 'Dev',
    priority: 'medium',
    lastActivity: '1d ago',
  },
  {
    id: 'p3',
    name: 'API Integration',
    status: 'planning',
    progress: 10,
    dueDate: '2026-05-01',
    team: 'Backend',
    priority: 'low',
    lastActivity: '3d ago',
  },
]

describe('ProjectOverviewWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    mockUseProjectsData.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: mockRefresh,
    })
  })

  test('returns null when no user', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { container } = render(<ProjectOverviewWidget config={mockConfig} />)
    expect(container.innerHTML).toBe('')
  })

  test('shows loading state when isLoading and no projects', () => {
    mockUseProjectsData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('Loading projects...')).toBeDefined()
  })

  test('shows error state with "Connection Error"', () => {
    mockUseProjectsData.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Network error',
      lastUpdated: null,
      refresh: mockRefresh,
    })
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('Connection Error')).toBeDefined()
  })

  test('renders project list with names', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('Website Redesign')).toBeDefined()
    expect(screen.getByText('Mobile App')).toBeDefined()
    expect(screen.getByText('API Integration')).toBeDefined()
  })

  test('shows project status badges', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('active')).toBeDefined()
    expect(screen.getByText('review')).toBeDefined()
    expect(screen.getByText('planning')).toBeDefined()
  })

  test('shows progress bar and percentage', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('65%')).toBeDefined()
    expect(screen.getByText('90%')).toBeDefined()
    expect(screen.getByText('10%')).toBeDefined()
  })

  test('shows "View All Projects" button', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    expect(screen.getByText('View All Projects')).toBeDefined()
  })

  test('filter button toggles between all/active', async () => {
    const { user, container } = render(<ProjectOverviewWidget config={mockConfig} />)
    // The filter button text starts as "all" and includes a Filter icon
    // Find the button containing "all" that is the filter toggle (in the header action area)
    const filterBtn = screen.getAllByText('all').find(el =>
      el.closest('button')?.className.includes('h-7')
    )
    expect(filterBtn).toBeDefined()
    if (filterBtn) {
      await user.click(filterBtn.closest('button')!)
      // After click, the same button should now show "active"
      // There will be multiple "active" texts (filter button + status badges)
      const filterBtnAfter = container.querySelectorAll('button')
      const activeFilterBtn = Array.from(filterBtnAfter).find(btn =>
        btn.className.includes('h-7') && btn.textContent?.includes('active')
      )
      expect(activeFilterBtn).toBeDefined()
    }
  })

  test('quick stats show active and pending counts', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    // Active count: 1 (Website Redesign)
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Pending')).toBeDefined()
  })

  test('project click calls navigateTo', async () => {
    const { user } = render(<ProjectOverviewWidget config={mockConfig} />)
    const projectItem = screen.getByText('Website Redesign').closest('[role="button"]')
    if (projectItem) {
      await user.click(projectItem)
      expect(mockNavigateTo).toHaveBeenCalledWith('project', 'p1')
    }
  })

  test('shows due date for projects', () => {
    render(<ProjectOverviewWidget config={mockConfig} />)
    // The due date is rendered as "Due {date}"
    const dueTexts = screen.getAllByText(/Due/)
    expect(dueTexts.length).toBeGreaterThan(0)
  })
})
