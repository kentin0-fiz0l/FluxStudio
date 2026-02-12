import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card', () => {
  test('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeDefined()
  })

  test('renders full card with all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Title')).toBeDefined()
    expect(screen.getByText('Description')).toBeDefined()
    expect(screen.getByText('Body')).toBeDefined()
    expect(screen.getByText('Footer')).toBeDefined()
  })

  test('interactive card gets button role', () => {
    render(<Card interactive>Clickable</Card>)
    expect(screen.getByRole('button')).toBeDefined()
  })

  test('interactive card is focusable', () => {
    render(<Card interactive>Clickable</Card>)
    expect(screen.getByRole('button').tabIndex).toBe(0)
  })

  test('applies variant classes', () => {
    render(<Card variant="elevated">Elevated</Card>)
    expect(screen.getByText('Elevated').className).toContain('shadow-3')
  })

  test('applies custom className', () => {
    render(<Card className="my-custom">Content</Card>)
    expect(screen.getByText('Content').className).toContain('my-custom')
  })
})
