import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../dropdown-menu'

describe('DropdownMenu', () => {
  const renderMenu = () =>
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

  test('does not show content initially', () => {
    renderMenu()
    expect(screen.queryByText('Edit')).toBeNull()
  })

  test('opens menu on trigger click', async () => {
    const { user } = renderMenu()
    await user.click(screen.getByText('Actions'))
    expect(screen.getByText('Edit')).toBeDefined()
    expect(screen.getByText('Delete')).toBeDefined()
  })

  test('shows label', async () => {
    const { user } = renderMenu()
    await user.click(screen.getByText('Actions'))
    expect(screen.getByText('Options')).toBeDefined()
  })

  test('item receives focus on keyboard nav', async () => {
    const { user } = renderMenu()
    await user.click(screen.getByText('Actions'))
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('Edit').closest('[data-slot="dropdown-menu-item"]')).toBeDefined()
  })
})
