/**
 * Basic test to verify testing infrastructure
 */
import { render, screen } from '@testing-library/react'
import { expect, test, describe } from 'vitest'

// Simple component for testing
function HelloWorld({ name = 'World' }: { name?: string }) {
  return <div>Hello {name}!</div>
}

describe('Testing Infrastructure', () => {
  test('renders hello world', () => {
    render(<HelloWorld />)
    expect(screen.getByText('Hello World!')).toBeDefined()
  })

  test('renders custom name', () => {
    render(<HelloWorld name="FluxStudio" />)
    expect(screen.getByText('Hello FluxStudio!')).toBeDefined()
  })

  test('basic math works', () => {
    expect(2 + 2).toBe(4)
  })
})