import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../dialog'

describe('Dialog', () => {
  test('does not show content by default', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Title')).toBeNull()
  })

  test('opens when trigger is clicked', async () => {
    const { user } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Title')).toBeDefined()
    expect(screen.getByText('Desc')).toBeDefined()
  })

  test('closes with close button', async () => {
    const { user } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Title')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Title')).toBeNull()
  })

  test('closes with escape key', async () => {
    const { user } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Title')).toBeDefined()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Title')).toBeNull()
  })

  test('renders in open controlled mode', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled</DialogTitle>
            <DialogDescription>Always open</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Controlled')).toBeDefined()
  })
})
