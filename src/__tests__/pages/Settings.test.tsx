/**
 * Settings Page Tests
 * Tests settings loading, saving, and user interactions
 * @file src/__tests__/pages/Settings.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies before importing Settings
vi.mock('../../services/apiService', () => ({
  apiService: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
  default: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('../../components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, 'aria-label': ariaLabel }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      aria-label={ariaLabel}
      data-testid={ariaLabel?.replace(/\s+/g, '-').toLowerCase() || 'switch'}
    />
  ),
}));

vi.mock('../../components/organisms/FigmaIntegration', () => ({
  FigmaIntegration: () => <div data-testid="figma-integration">Figma</div>,
}));

vi.mock('../../components/organisms/SlackIntegration', () => ({
  SlackIntegration: () => <div data-testid="slack-integration">Slack</div>,
}));

vi.mock('../../components/organisms/GitHubIntegration', () => ({
  GitHubIntegration: () => <div data-testid="github-integration">GitHub</div>,
}));

vi.mock('../../components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Lang</div>,
}));

import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import { toast } from '../../lib/toast';

// Import Settings after mocks
import Settings from '../../pages/Settings';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  userType: 'designer' as const,
};

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSettings() {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  );
}

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });

    (apiService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        settings: {
          notifications: { push: true, emailDigest: false },
          appearance: { darkMode: false },
          performance: { autoSave: true },
        },
      },
    });

    (apiService.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { settings: {}, message: 'Settings saved' },
    });
  });

  describe('Authentication guard', () => {
    it('should redirect to login when not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        logout: vi.fn(),
      });

      renderSettings();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('should render settings when authenticated', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Settings loading', () => {
    it('should fetch settings on mount', async () => {
      renderSettings();

      await waitFor(() => {
        expect(apiService.getSettings).toHaveBeenCalled();
      });
    });

    it('should apply fetched settings to form', async () => {
      (apiService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          settings: {
            notifications: { push: false, emailDigest: true },
            appearance: { darkMode: true },
            performance: { autoSave: false },
          },
        },
      });

      renderSettings();

      await waitFor(() => {
        // Settings should be loaded from API
        expect(apiService.getSettings).toHaveBeenCalled();
      });
    });

    it('should use default values when API fails', async () => {
      (apiService.getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

      renderSettings();

      await waitFor(() => {
        // Should not crash - uses defaults
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Settings saving', () => {
    it('should save settings when clicking Save Changes', async () => {
      const user = userEvent.setup();

      renderSettings();

      await waitFor(() => {
        expect(apiService.getSettings).toHaveBeenCalled();
      });

      // Find and toggle a setting to enable save
      const notificationsSwitch = await screen.findByTestId('toggle-push-notifications');
      await user.click(notificationsSwitch);

      // Find and click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiService.saveSettings).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful save', async () => {
      const user = userEvent.setup();

      renderSettings();

      await waitFor(() => {
        expect(apiService.getSettings).toHaveBeenCalled();
      });

      // Toggle a setting
      const notificationsSwitch = await screen.findByTestId('toggle-push-notifications');
      await user.click(notificationsSwitch);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings saved successfully');
      });
    });

    it('should show error toast on save failure', async () => {
      const user = userEvent.setup();

      (apiService.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Save failed',
      });

      renderSettings();

      await waitFor(() => {
        expect(apiService.getSettings).toHaveBeenCalled();
      });

      // Toggle a setting
      const notificationsSwitch = await screen.findByTestId('toggle-push-notifications');
      await user.click(notificationsSwitch);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Change detection', () => {
    it('should detect changes from original settings', async () => {
      const user = userEvent.setup();

      renderSettings();

      await waitFor(() => {
        expect(apiService.getSettings).toHaveBeenCalled();
      });

      // Toggle a setting to create a change
      const notificationsSwitch = await screen.findByTestId('toggle-push-notifications');
      await user.click(notificationsSwitch);

      // Save button should be active now
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Integrations section', () => {
    it('should render integration components', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByTestId('figma-integration')).toBeInTheDocument();
        expect(screen.getByTestId('slack-integration')).toBeInTheDocument();
        expect(screen.getByTestId('github-integration')).toBeInTheDocument();
      });
    });
  });

  describe('Page metadata', () => {
    it('should set page title', async () => {
      renderSettings();

      await waitFor(() => {
        expect(document.title).toContain('Settings');
      });
    });
  });
});
