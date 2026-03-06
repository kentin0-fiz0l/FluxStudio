import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { PersonalizationWidget } from '../PersonalizationWidget'
import type { WidgetConfig } from '../types'

const mockUpdateSettings = vi.fn()
const mockResetToDefaults = vi.fn()

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    settings: {
      variant: 'dark',
      layoutDensity: 'comfortable',
      showAnimations: true,
      sidebarCollapsed: false,
      customAccentColor: undefined,
    },
    updateSettings: mockUpdateSettings,
    resetToDefaults: mockResetToDefaults,
  }),
  THEME_VARIANTS: {
    dark: { name: 'Dark', description: 'Dark theme', colors: { primary: '#1e293b' } },
    light: { name: 'Light', description: 'Light theme', colors: { primary: '#ffffff' } },
  },
  LAYOUT_DENSITIES: {
    compact: { name: 'Compact' },
    comfortable: { name: 'Comfortable' },
    spacious: { name: 'Spacious' },
  },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'personalization-widget',
  title: 'Personalization',
  description: 'Customize your dashboard',
  component: PersonalizationWidget,
  category: 'settings',
  size: 'medium',
  permissions: ['admin'],
}

describe('PersonalizationWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders "Theme" section label', () => {
    render(<PersonalizationWidget config={mockConfig} />)
    expect(screen.getByText('Theme')).toBeDefined()
  })

  test('renders theme variant buttons', () => {
    render(<PersonalizationWidget config={mockConfig} />)
    expect(screen.getByText('Dark')).toBeDefined()
    expect(screen.getByText('Light')).toBeDefined()
  })

  test('clicking theme button calls updateSettings with variant', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    await user.click(screen.getByText('Light'))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ variant: 'light' })
  })

  test('renders "Layout Density" section', () => {
    render(<PersonalizationWidget config={mockConfig} />)
    expect(screen.getByText('Layout Density')).toBeDefined()
  })

  test('density button calls updateSettings with layoutDensity', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    await user.click(screen.getByText('Compact'))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ layoutDensity: 'compact' })
  })

  test('animations toggle button calls updateSettings', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    // Animations toggle shows "Enabled" since showAnimations is true
    await user.click(screen.getByText('Enabled'))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ showAnimations: false })
  })

  test('sidebar collapse toggle works', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    // sidebarCollapsed is false, so button shows "Expanded"
    await user.click(screen.getByText('Expanded'))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ sidebarCollapsed: true })
  })

  test('reset to defaults button calls resetToDefaults', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    await user.click(screen.getByText('Reset to Defaults'))
    expect(mockResetToDefaults).toHaveBeenCalledOnce()
  })

  test('color picker opens on Custom button click', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    await user.click(screen.getByText('Custom'))
    // Color picker input should now be visible
    expect(screen.getByText('Apply')).toBeDefined()
  })

  test('apply color calls updateSettings with customAccentColor', async () => {
    const { user } = render(<PersonalizationWidget config={mockConfig} />)
    // Open color picker
    await user.click(screen.getByText('Custom'))
    // Click Apply
    await user.click(screen.getByText('Apply'))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ customAccentColor: '#3b82f6' })
  })
})
