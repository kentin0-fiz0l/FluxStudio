import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import { Avatar, AvatarImage, AvatarFallback } from '../avatar'

describe('Avatar', () => {
  test('renders fallback when no image', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('JD')).toBeDefined()
  })

  test('renders with image and shows fallback in jsdom', () => {
    // Radix Avatar only shows the img after onLoad fires, which doesn't
    // happen in jsdom. So we verify the fallback is shown as expected.
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="John Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    // Fallback should be visible since jsdom can't load images
    expect(screen.getByText('JD')).toBeDefined()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Avatar className="h-20 w-20">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(container.firstElementChild?.className).toContain('h-20')
  })

  test('fallback has data-slot attribute', () => {
    render(
      <Avatar>
        <AvatarFallback>XY</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('XY').getAttribute('data-slot')).toBe('avatar-fallback')
  })

  test('root has data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(container.firstElementChild?.getAttribute('data-slot')).toBe('avatar')
  })
})
