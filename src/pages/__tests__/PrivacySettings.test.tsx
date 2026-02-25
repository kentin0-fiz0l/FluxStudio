/**
 * PrivacySettings Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    logout: vi.fn(),
  })),
}));

vi.mock('../../components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      data-testid="switch"
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
  },
}));

vi.mock('../../lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
}));

import PrivacySettings from '../settings/PrivacySettings';

describe('PrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({
      data: {
        consents: {
          marketing_emails: { granted: false },
          analytics_tracking: { granted: true },
          third_party_sharing: { granted: false },
        },
        deletionStatus: null,
      },
    });
    mockApiPost.mockResolvedValue({ data: {} });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PrivacySettings />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Download My Data')).toBeInTheDocument();
  });

  test('displays Back to Settings link', () => {
    renderPage();
    expect(screen.getByText('Back to Settings')).toBeInTheDocument();
  });

  test('displays data export section', () => {
    renderPage();
    expect(screen.getByText('Download My Data')).toBeInTheDocument();
    expect(
      screen.getByText(/Export all your personal data in JSON format/)
    ).toBeInTheDocument();
  });

  test('displays request data export button', () => {
    renderPage();
    expect(screen.getByText('Request Data Export')).toBeInTheDocument();
  });

  test('displays privacy preferences section', () => {
    renderPage();
    expect(screen.getByText('Privacy Preferences')).toBeInTheDocument();
    expect(screen.getByText('Control how we use your data')).toBeInTheDocument();
  });

  test('loads consent preferences on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/compliance/consents');
    });
  });

  test('displays consent toggles after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Marketing Emails')).toBeInTheDocument();
      expect(screen.getByText('Analytics Tracking')).toBeInTheDocument();
      expect(screen.getByText('Third-Party Sharing')).toBeInTheDocument();
    });
  });

  test('displays delete my account section', () => {
    renderPage();
    expect(screen.getByText('Delete My Account')).toBeInTheDocument();
    expect(
      screen.getByText(/Permanently delete your account and all personal data/)
    ).toBeInTheDocument();
  });

  test('displays request account deletion button', () => {
    renderPage();
    expect(screen.getByText('Request Account Deletion')).toBeInTheDocument();
  });

  test('shows delete confirmation when button is clicked', async () => {
    renderPage();
    const deleteButton = screen.getByText('Request Account Deletion');
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.getByText('Are you sure? This action will:')).toBeInTheDocument();
      expect(screen.getByText('Confirm Delete Account')).toBeInTheDocument();
    });
  });

  test('shows cancel button in delete confirmation', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Request Account Deletion'));
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  test('cancel hides the delete confirmation', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Request Account Deletion'));
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete Account')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete Account')).not.toBeInTheDocument();
    });
  });

  test('displays loading state while fetching consents', () => {
    mockApiGet.mockImplementation(() => new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
  });
});
