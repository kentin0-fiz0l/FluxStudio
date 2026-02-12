import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'

import { Button } from '../button'

describe('Button', () => {
  test('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined()
  })

  test('calls onClick handler', async () => {
    const onClick = vi.fn()
    const { user } = render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    const { user } = render(<Button disabled onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  test('is disabled when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('renders loading spinner when loading', () => {
    render(<Button loading>Save</Button>)
    const spinner = screen.getByRole('button').querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  test('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button').className).toContain('bg-error')
  })

  test('applies size classes', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('h-12')
  })

  test('renders icon when provided', () => {
    render(<Button icon={<span data-testid="icon">*</span>}>With Icon</Button>)
    expect(screen.getByTestId('icon')).toBeDefined()
  })

  test('supports asChild with Slot', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Link Button' })).toBeDefined()
  })
})
