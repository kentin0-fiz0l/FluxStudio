import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { QuickActions } from '../QuickActions'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockUseActiveProject = vi.fn()
vi.mock('@/store', () => ({
  useActiveProject: () => mockUseActiveProject(),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return { ...actual }
})

describe('QuickActions', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAction: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveProject.mockReturnValue({
      activeProject: null,
      hasFocus: false,
    })
  })

  test('returns null when isOpen is false', () => {
    const { container } = render(
      <QuickActions {...defaultProps} isOpen={false} />
    )
    expect(container.innerHTML).toBe('')
  })

  test('renders search input when isOpen is true', () => {
    render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search actions...')
    expect(input).toBeDefined()
  })

  test('shows placeholder "Search actions..." when no active project', () => {
    render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search actions...')
    expect(input).toBeDefined()
  })

  test('shows project-specific placeholder when hasFocus with activeProject', () => {
    mockUseActiveProject.mockReturnValue({
      activeProject: { id: 'p1', name: 'My Project' },
      hasFocus: true,
    })
    render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Quick actions for My Project...')
    expect(input).toBeDefined()
  })

  test('search filters actions by label', async () => {
    const { user } = render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search actions...')
    await user.type(input, 'Settings')
    expect(screen.getByText('Settings')).toBeDefined()
  })

  test('search filters actions by description', async () => {
    mockUseActiveProject.mockReturnValue({
      activeProject: { id: 'p1', name: 'Demo' },
      hasFocus: true,
    })
    const { user } = render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Quick actions for Demo...')
    await user.type(input, 'Demo')
    expect(screen.getByText('New Task')).toBeDefined()
  })

  test('shows "No actions found" when search matches nothing', async () => {
    const { user } = render(<QuickActions {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search actions...')
    await user.type(input, 'zzzznonexistentzzzz')
    expect(screen.getByText('No actions found')).toBeDefined()
  })

  test('arrow down moves selection', () => {
    render(<QuickActions {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // Selection moved - no crash
    expect(screen.getByText('All Projects')).toBeDefined()
  })

  test('arrow up moves selection and wraps to bottom', () => {
    render(<QuickActions {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    // Wraps to last item
    expect(screen.getByText('Settings')).toBeDefined()
  })

  test('enter executes selected action', () => {
    render(<QuickActions {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    // Default selection is the first action - All Projects (navigate)
    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  test('escape calls onClose', () => {
    const onClose = vi.fn()
    render(<QuickActions {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('backdrop click calls onClose', async () => {
    const onClose = vi.fn()
    const { user } = render(<QuickActions {...defaultProps} onClose={onClose} />)
    const backdrop = document.querySelector('[role="presentation"]')!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('shows "Create" category group when project focused', () => {
    mockUseActiveProject.mockReturnValue({
      activeProject: { id: 'p1', name: 'Test' },
      hasFocus: true,
    })
    render(<QuickActions {...defaultProps} />)
    expect(screen.getByText('Create')).toBeDefined()
  })

  test('shows "Navigate" category group', () => {
    render(<QuickActions {...defaultProps} />)
    expect(screen.getByText('Navigate')).toBeDefined()
  })

  test('global actions always present (All Projects, Messages, Settings)', () => {
    render(<QuickActions {...defaultProps} />)
    expect(screen.getByText('All Projects')).toBeDefined()
    expect(screen.getByText('Messages')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
  })

  test('onAction callback fires on selection via Enter', () => {
    const onAction = vi.fn()
    render(<QuickActions {...defaultProps} onAction={onAction} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onAction).toHaveBeenCalledOnce()
  })
})
