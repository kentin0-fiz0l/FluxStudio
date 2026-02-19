/**
 * Settings Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    getSettings: vi.fn().mockResolvedValue({ success: true, data: { settings: {} } }),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock UI components
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

vi.mock('@/components/organisms/FigmaIntegration', () => ({
  FigmaIntegration: () => <div data-testid="figma-integration">Figma</div>,
}));

vi.mock('@/components/organisms/SlackIntegration', () => ({
  SlackIntegration: () => <div data-testid="slack-integration">Slack</div>,
}));

vi.mock('@/components/organisms/GitHubIntegration', () => ({
  GitHubIntegration: () => <div data-testid="github-integration">GitHub</div>,
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

import Settings from '../Settings';

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSettings = () => {
    return render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('displays notifications section', () => {
    renderSettings();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Email Digest')).toBeInTheDocument();
  });

  test('displays appearance section', () => {
    renderSettings();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  test('displays privacy and security section', () => {
    renderSettings();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument();
  });

  test('displays performance section', () => {
    renderSettings();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Auto-save')).toBeInTheDocument();
  });

  test('displays integrations section', () => {
    renderSettings();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByTestId('figma-integration')).toBeInTheDocument();
    expect(screen.getByTestId('slack-integration')).toBeInTheDocument();
    expect(screen.getByTestId('github-integration')).toBeInTheDocument();
  });

  test('displays back to projects link', () => {
    renderSettings();
    const link = screen.getByText('← Back to Projects');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/projects');
  });

  test('returns null when user is not authenticated', async () => {
    const { useAuth } = await import('@/contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    } as any);

    const { container } = renderSettings();
    expect(container.innerHTML).toBe('');
  });
});
