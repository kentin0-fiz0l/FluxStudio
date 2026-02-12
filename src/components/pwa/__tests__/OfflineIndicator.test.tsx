import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@/test/utils';

// Mock the usePWA hook
const mockUsePWA = {
  isOnline: true,
  canInstall: false,
  isUpdateAvailable: false,
  pendingSyncCount: 0,
  installApp: vi.fn(),
  updateApp: vi.fn(),
  syncOfflineData: vi.fn(),
};

vi.mock('../../../hooks/usePWA', () => ({
  usePWA: () => mockUsePWA,
}));

import { OfflineIndicator, NetworkStatusBadge } from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUsePWA.isOnline = true;
    mockUsePWA.canInstall = false;
    mockUsePWA.isUpdateAvailable = false;
    mockUsePWA.pendingSyncCount = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders nothing when online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('shows offline banner after delay when offline', async () => {
    mockUsePWA.isOnline = false;
    render(<OfflineIndicator />);

    // Banner should not appear immediately
    expect(screen.queryByText("You're offline")).toBeNull();

    // Advance past the 500ms delay
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText("You're offline")).toBeTruthy();
  });

  test('shows pending sync count when offline', async () => {
    mockUsePWA.isOnline = false;
    mockUsePWA.pendingSyncCount = 3;
    render(<OfflineIndicator />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText(/3 changes pending/)).toBeTruthy();
  });

  test('applies top position class', async () => {
    mockUsePWA.isOnline = false;
    render(<OfflineIndicator position="top" />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('top-0');
  });

  test('has WCAG aria-live attribute', async () => {
    mockUsePWA.isOnline = false;
    render(<OfflineIndicator />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('polite');
  });
});

describe('NetworkStatusBadge', () => {
  test('renders without crashing', () => {
    // NetworkStatusBadge may be a simple status indicator
    const { container } = render(<NetworkStatusBadge />);
    expect(container).toBeTruthy();
  });
});
