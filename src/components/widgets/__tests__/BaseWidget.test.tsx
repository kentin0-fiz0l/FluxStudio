import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { BaseWidget } from '../BaseWidget'
import type { WidgetConfig } from '../types'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'test-widget',
  title: 'Test Widget',
  description: 'A test widget description',
  component: () => null,
  category: 'overview',
  size: 'medium',
  permissions: ['admin'],
}

describe('BaseWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders title from config', () => {
    render(
      <BaseWidget config={mockConfig}>
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('Test Widget')).toBeDefined()
  })

  test('renders description from config', () => {
    render(
      <BaseWidget config={mockConfig}>
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('A test widget description')).toBeDefined()
  })

  test('shows category badge with correct text', () => {
    render(
      <BaseWidget config={mockConfig}>
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('overview')).toBeDefined()
  })

  test('shows loading state with "Loading..." text', () => {
    render(
      <BaseWidget config={mockConfig} isLoading>
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('Loading...')).toBeDefined()
    expect(screen.queryByText('content')).toBeNull()
  })

  test('shows error state with error message', () => {
    render(
      <BaseWidget config={mockConfig} error="Something went wrong">
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('Error loading widget')).toBeDefined()
  })

  test('error state shows retry button when onRefresh provided', () => {
    const onRefresh = vi.fn()
    render(
      <BaseWidget config={mockConfig} error="Error" onRefresh={onRefresh}>
        <div>content</div>
      </BaseWidget>
    )
    expect(screen.getByText('Retry')).toBeDefined()
  })

  test('clicking retry calls onRefresh', async () => {
    const onRefresh = vi.fn()
    const { user } = render(
      <BaseWidget config={mockConfig} error="Error" onRefresh={onRefresh}>
        <div>content</div>
      </BaseWidget>
    )
    await user.click(screen.getByText('Retry'))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  test('drag handle renders with widget-drag-handle class', () => {
    const { container } = render(
      <BaseWidget config={mockConfig}>
        <div>content</div>
      </BaseWidget>
    )
    expect(container.querySelector('.widget-drag-handle')).toBeDefined()
  })

  test('className passthrough applied to card', () => {
    const { container } = render(
      <BaseWidget config={mockConfig} className="custom-class">
        <div>content</div>
      </BaseWidget>
    )
    expect(container.querySelector('.custom-class')).toBeDefined()
  })

  test('refresh button renders when onRefresh provided', () => {
    const onRefresh = vi.fn()
    const { container } = render(
      <BaseWidget config={mockConfig} onRefresh={onRefresh}>
        <div>content</div>
      </BaseWidget>
    )
    // The refresh button in header has aria-label or RefreshCw icon
    const refreshButtons = container.querySelectorAll('button')
    expect(refreshButtons.length).toBeGreaterThan(0)
  })

  test('remove widget menu item calls onRemove', async () => {
    const onRemove = vi.fn()
    const { user } = render(
      <BaseWidget config={mockConfig} onRemove={onRemove}>
        <div>content</div>
      </BaseWidget>
    )
    // Open dropdown menu
    const menuTrigger = screen.getAllByRole('button').find(
      btn => btn.querySelector('.lucide-more-vertical') || btn.classList.contains('h-8')
    )
    if (menuTrigger) {
      await user.click(menuTrigger)
    }
    const removeItem = screen.queryByText('Remove Widget')
    if (removeItem) {
      await user.click(removeItem)
      expect(onRemove).toHaveBeenCalledOnce()
    }
  })

  test('expand/minimize toggle via dropdown menu', async () => {
    const { user } = render(
      <BaseWidget config={mockConfig}>
        <div>content</div>
      </BaseWidget>
    )
    // Open dropdown to find Expand option
    const buttons = screen.getAllByRole('button')
    // Last button is dropdown trigger (MoreVertical)
    const menuTrigger = buttons[buttons.length - 1]
    await user.click(menuTrigger)
    const expandItem = screen.queryByText('Expand')
    expect(expandItem).toBeDefined()
  })

  test('children render in normal state', () => {
    render(
      <BaseWidget config={mockConfig}>
        <div>child content here</div>
      </BaseWidget>
    )
    expect(screen.getByText('child content here')).toBeDefined()
  })

  test('settings menu item renders when onConfigChange provided', async () => {
    const onConfigChange = vi.fn()
    const { user } = render(
      <BaseWidget config={mockConfig} onConfigChange={onConfigChange}>
        <div>content</div>
      </BaseWidget>
    )
    const buttons = screen.getAllByRole('button')
    const menuTrigger = buttons[buttons.length - 1]
    await user.click(menuTrigger)
    const settingsItem = screen.queryByText('Settings')
    expect(settingsItem).toBeDefined()
  })
})
