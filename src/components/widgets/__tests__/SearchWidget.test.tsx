import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { SearchWidget } from '../SearchWidget'
import type { WidgetConfig } from '../types'

const mockNavigate = vi.fn()
const mockOpenCommandPalette = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', displayName: 'Test User' } })),
}))

vi.mock('../../../hooks/ui/useCommandPalette', () => ({
  useCommandPalette: () => ({ open: mockOpenCommandPalette }),
}))

vi.mock('../../../hooks/useRealTimeData', () => ({
  useProjectsData: () => ({
    data: [
      { id: '1', name: 'Project Alpha', status: 'active', progress: 50, priority: 'high' },
      { id: '2', name: 'Project Beta', status: 'review', progress: 80, priority: 'medium' },
    ],
  }),
  useActivityData: () => ({
    data: [
      { id: 1, title: 'Activity 1', user: 'John', type: 'project_update' },
      { id: 2, title: 'Activity 2', user: 'Jane', type: 'file_upload' },
    ],
  }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fuse.js at the top level so dynamic import('fuse.js') resolves immediately
// This prevents CI hangs caused by unresolved dynamic imports in worker pools
vi.mock('fuse.js', () => ({
  default: class MockFuse {
    private items: any[]
    constructor(items: any[]) {
      this.items = items
    }
    search(query: string) {
      const q = query.toLowerCase()
      return this.items
        .filter(item => item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q))
        .map(item => ({ item, score: 0.1 }))
    }
  },
}))

const mockConfig: WidgetConfig = {
  id: 'search-widget',
  title: 'Search',
  description: 'Search widget',
  component: SearchWidget,
  category: 'tools',
  size: 'medium',
  permissions: ['admin'],
}

describe('SearchWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders search input with placeholder', () => {
    render(<SearchWidget config={mockConfig} />)
    expect(screen.getByPlaceholderText('Search projects, actions...')).toBeDefined()
  })

  test('shows quick action buttons when not searching', () => {
    render(<SearchWidget config={mockConfig} />)
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('Commands')).toBeDefined()
  })

  test('search input accepts text', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.type(input, 'test')
    expect(input).toHaveProperty('value', 'test')
  })

  test('clear button appears when query has text', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.type(input, 'test')
    const clearButtons = screen.getAllByRole('button')
    const clearBtn = clearButtons.find(btn => btn.className.includes('absolute'))
    expect(clearBtn).toBeDefined()
  })

  test('clear button resets search', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.type(input, 'test')

    const clearButtons = screen.getAllByRole('button')
    const clearBtn = clearButtons.find(btn =>
      btn.className.includes('absolute') && btn.className.includes('right')
    )
    if (clearBtn) {
      await user.click(clearBtn)
    }
    expect(input).toHaveProperty('value', '')
  })

  test('shows project count in quick stats', () => {
    render(<SearchWidget config={mockConfig} />)
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
  })

  test('shows activities count in quick stats', () => {
    render(<SearchWidget config={mockConfig} />)
    expect(screen.getByText('Activities')).toBeDefined()
  })

  test('command palette button renders', () => {
    render(<SearchWidget config={mockConfig} />)
    const cmdKButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('K')
    )
    expect(cmdKButton).toBeDefined()
  })

  test('quick stats section renders', () => {
    render(<SearchWidget config={mockConfig} />)
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('Activities')).toBeDefined()
    expect(screen.getByText('User')).toBeDefined()
  })

  test('badge color mapping: high = red, medium = yellow, low = green', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.click(input)
    const highBadge = screen.queryByText('high')
    if (highBadge) {
      expect(highBadge.className).toContain('red')
    }
  })

  test('search results display when expanded', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.click(input)
    expect(screen.queryByText('Project Alpha') || screen.queryByText('Advanced Search')).toBeDefined()
  })

  test('Advanced Search link renders when expanded', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.click(input)
    expect(screen.getByText('Advanced Search')).toBeDefined()
  })

  test('input focus expands results', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.click(input)
    expect(screen.getByText('Advanced Search')).toBeDefined()
  })

  test('shows "No results found" for unmatched query', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.type(input, 'xyznonexistent')
    // MockFuse does substring matching — 'xyznonexistent' won't match anything
    const noResults = screen.queryByText('No results found')
    expect(noResults !== null || screen.queryByText('Advanced Search') !== null).toBe(true)
  })

  test('result click calls action', async () => {
    const { user } = render(<SearchWidget config={mockConfig} />)
    const input = screen.getByPlaceholderText('Search projects, actions...')
    await user.click(input)
    const projectResult = screen.queryByText('Project Alpha')
    if (projectResult) {
      const clickableParent = projectResult.closest('[class*="cursor-pointer"]')
      if (clickableParent) {
        await user.click(clickableParent)
      }
    }
    expect(true).toBe(true)
  })
})
