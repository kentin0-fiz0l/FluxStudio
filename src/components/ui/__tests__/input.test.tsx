import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'

import { Input } from '../input'

describe('Input', () => {
  test('renders with placeholder', () => {
    render(<Input placeholder="Enter name" />)
    expect(screen.getByPlaceholderText('Enter name')).toBeDefined()
  })

  test('handles value change', async () => {
    const onChange = vi.fn()
    const { user } = render(<Input onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  test('displays typed text', async () => {
    const { user } = render(<Input />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })

  test('is disabled when disabled prop set', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  test('shows error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeDefined()
    expect(screen.getByRole('alert')).toBeDefined()
  })

  test('sets aria-invalid on error', () => {
    render(<Input error="Bad" />)
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true')
  })

  test('shows success message', () => {
    render(<Input success="Looks good!" />)
    expect(screen.getByText('Looks good!')).toBeDefined()
  })

  test('shows helper text', () => {
    render(<Input helperText="Enter your full name" />)
    expect(screen.getByText('Enter your full name')).toBeDefined()
  })

  test('renders label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeDefined()
  })
})
