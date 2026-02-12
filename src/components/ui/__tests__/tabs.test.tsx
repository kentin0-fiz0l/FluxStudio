import { describe, test, expect } from 'vitest'
import { render, screen } from '@/test/utils'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'

describe('Tabs', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

  test('renders tab triggers', () => {
    renderTabs()
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeDefined()
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeDefined()
  })

  test('shows default tab content', () => {
    renderTabs()
    expect(screen.getByText('Content 1')).toBeDefined()
  })

  test('switches tab on click', async () => {
    const { user } = renderTabs()
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }))
    expect(screen.getByText('Content 2')).toBeDefined()
  })

  test('marks active tab', () => {
    renderTabs()
    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('data-state')).toBe('active')
    expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('data-state')).toBe('inactive')
  })

  test('switches active state on click', async () => {
    const { user } = renderTabs()
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }))
    expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('data-state')).toBe('active')
    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('data-state')).toBe('inactive')
  })
})
