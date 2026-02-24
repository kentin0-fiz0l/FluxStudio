/**
 * Support Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }: any) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { Support } from '../Support';

describe('Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  test('renders inside dashboard layout', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays form title', () => {
    renderPage();
    expect(screen.getByText('Submit a Support Request')).toBeInTheDocument();
  });

  test('pre-fills name and email from user context', () => {
    renderPage();
    const nameInput = screen.getByPlaceholderText('John Doe') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('john@example.com') as HTMLInputElement;
    expect(nameInput.value).toBe('Test User');
    expect(emailInput.value).toBe('test@example.com');
  });

  test('displays category dropdown', () => {
    renderPage();
    expect(screen.getByDisplayValue('General Question')).toBeInTheDocument();
  });

  test('displays subject field', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Brief description of your issue')).toBeInTheDocument();
  });

  test('displays message textarea', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/please describe your issue/i)).toBeInTheDocument();
  });

  test('displays submit and cancel buttons', () => {
    renderPage();
    expect(screen.getByText('Submit Request')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('shows validation error when subject is empty on submit', async () => {
    renderPage();
    // Name/email are pre-filled, but subject and message are empty
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter a subject')).toBeInTheDocument();
    });
  });

  test('shows success state after successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }) as any;

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Brief description of your issue'), {
      target: { value: 'Test subject', name: 'subject' },
    });
    fireEvent.change(screen.getByPlaceholderText(/please describe your issue/i), {
      target: { value: 'This is a detailed description of the issue I am experiencing.', name: 'message' },
    });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Request Submitted')).toBeInTheDocument();
    });
  });

  test('displays alternative contact email', () => {
    renderPage();
    expect(screen.getByText('support@fluxstudio.art')).toBeInTheDocument();
  });
});
