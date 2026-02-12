import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import { Badge } from '../badge'

describe('Badge', () => {
  test('renders with text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeDefined()
  })

  test('applies default variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('bg-neutral')
  })

  test('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success').className).toContain('bg-success')
  })

  test('applies error variant', () => {
    render(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error').className).toContain('bg-error')
  })

  test('applies size sm', () => {
    render(<Badge size="sm">Small</Badge>)
    expect(screen.getByText('Small').className).toContain('text-xs')
  })

  test('applies size lg', () => {
    render(<Badge size="lg">Large</Badge>)
    expect(screen.getByText('Large').className).toContain('text-base')
  })

  test('renders dot indicator', () => {
    const { container } = render(<Badge dot variant="success">Online</Badge>)
    const dot = container.querySelector('.rounded-full.bg-success-600')
    expect(dot).toBeTruthy()
  })

  test('renders icon', () => {
    render(<Badge icon={<span data-testid="badge-icon">*</span>}>Tagged</Badge>)
    expect(screen.getByTestId('badge-icon')).toBeDefined()
  })
})
