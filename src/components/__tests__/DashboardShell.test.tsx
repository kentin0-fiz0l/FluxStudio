/**
 * DashboardShell Component Tests
 *
 * Tests: renders when authenticated, null when no user, content area.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { DashboardShell } from '../DashboardShell';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', name: 'Test User' } })),
}));

vi.mock('../../hooks/ui/useCommandPalette', () => ({
  useCommandPalette: vi.fn(() => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn(),
  })),
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../messaging/FloatingMessageButton', () => ({
  FloatingMessageButton: () => <div data-testid="floating-message-btn" />,
}));

vi.mock('../EnhancedHeader', () => ({
  EnhancedHeader: () => <div data-testid="enhanced-header" />,
}));

vi.mock('../../pages/File', () => ({
  File: () => <div data-testid="file-page" />,
}));

vi.mock('../messaging/MessagingSidepanel', () => ({
  MessagingSidepanel: () => <div data-testid="messaging-sidepanel" />,
}));

const { useAuth } = await import('@/store/slices/authSlice');

describe('DashboardShell', () => {
  test('renders null when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);

    const { container } = render(
      <DashboardShell>
        <div>Dashboard Content</div>
      </DashboardShell>
    );

    expect(container.innerHTML).toBe('');
  });

  test('renders shell layout when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', name: 'Test' } } as any);

    render(
      <DashboardShell>
        <div>Dashboard Content</div>
      </DashboardShell>
    );

    expect(screen.getByTestId('floating-message-btn')).toBeTruthy();
  });

  test('renders main content area with default view prompt', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', name: 'Test' } } as any);

    render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByText('Select a view from the navigation above.')).toBeTruthy();
  });

  test('renders floating message button', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', name: 'Test' } } as any);

    render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByTestId('floating-message-btn')).toBeTruthy();
  });
});
