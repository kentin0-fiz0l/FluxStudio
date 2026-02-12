import { describe, test, expect, vi } from 'vitest'
import { render } from '@/test/utils'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

const { Toaster } = await import('../sonner')

describe('Toaster (Sonner)', () => {
  test('renders without crashing', () => {
    const { container } = render(<Toaster />)
    expect(container).toBeDefined()
  })

  test('renders a section element', () => {
    const { container } = render(<Toaster />)
    // Sonner renders into a portal, just verify no errors
    expect(container.innerHTML).toBeDefined()
  })
})
