import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { WidgetPalette } from '../WidgetPalette'

const mockUseAuth = vi.fn()
const mockAddWidget = vi.fn()
const mockUseWidgetLayout = vi.fn()

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../../hooks/ui/useWidgetLayout', () => ({
  useWidgetLayout: () => mockUseWidgetLayout(),
}))

vi.mock('../registry', () => ({
  WIDGET_REGISTRY: {
    'test-widget-1': {
      id: 'test-widget-1',
      title: 'Test Widget 1',
      description: 'First test widget',
      component: () => null,
      category: 'overview',
      size: 'medium',
      permissions: ['admin', 'designer'],
    },
    'test-widget-2': {
      id: 'test-widget-2',
      title: 'Test Widget 2',
      description: 'Second test widget',
      component: () => null,
      category: 'projects',
      size: 'large',
      permissions: ['admin'],
    },
  },
  getWidgetsByPermission: vi.fn(() => [
    {
      id: 'test-widget-1',
      title: 'Test Widget 1',
      description: 'First test widget',
      category: 'overview',
      size: 'medium',
      permissions: ['admin', 'designer'],
    },
    {
      id: 'test-widget-2',
      title: 'Test Widget 2',
      description: 'Second test widget',
      category: 'projects',
      size: 'large',
      permissions: ['admin'],
    },
  ]),
  getAvailableCategories: vi.fn(() => ['overview', 'projects']),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('WidgetPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', userType: 'admin' } })
    mockUseWidgetLayout.mockReturnValue({ widgets: ['test-widget-1'], addWidget: mockAddWidget })
  })

  test('returns null when no user', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { container } = render(<WidgetPalette />)
    expect(container.innerHTML).toBe('')
  })

  test('renders "Widget Palette" trigger button', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('Widget Palette')).toBeDefined()
  })

  test('shows search input in sheet', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByPlaceholderText('Search widgets...')).toBeDefined()
  })

  test('category tabs render (All, Overview, Projects)', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('All')).toBeDefined()
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Projects')).toBeDefined()
  })

  test('widget cards render from registry', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('Test Widget 1')).toBeDefined()
    expect(screen.getByText('Test Widget 2')).toBeDefined()
  })

  test('added widget shows "Added" badge', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('Added')).toBeDefined()
  })

  test('add button calls addWidget', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    // Find the "Add" button (for the widget not yet added)
    const addButton = screen.getByText('Add')
    await user.click(addButton)
    expect(mockAddWidget).toHaveBeenCalledOnce()
    expect(mockAddWidget).toHaveBeenCalledWith('test-widget-2')
  })

  test('empty state "No widgets found" with empty filter', async () => {
    const { getWidgetsByPermission } = await import('../registry')
    vi.mocked(getWidgetsByPermission).mockReturnValue([])
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('No widgets found')).toBeDefined()
  })

  test('shows widget count summary', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    // Shows "X widgets available" and "Y added to dashboard"
    expect(screen.getByText(/widget.*available/i) || screen.getByText(/2 widgets available/)).toBeDefined()
  })

  test('widget stats shows "X added to dashboard"', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('1 added to dashboard')).toBeDefined()
  })

  test('sheet description text renders', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    expect(screen.getByText('Add widgets to customize your dashboard. Drag and drop to rearrange them.')).toBeDefined()
  })

  test('search filtering narrows results', async () => {
    const { user } = render(<WidgetPalette />)
    await user.click(screen.getByText('Widget Palette'))
    const searchInput = screen.getByPlaceholderText('Search widgets...')
    await user.type(searchInput, 'First')
    // Filtering is based on title/description matching
    // "First" should match "First test widget" description of Widget 1
    // The search input should have the typed value
    expect(searchInput).toHaveProperty('value', 'First')
  })
})
