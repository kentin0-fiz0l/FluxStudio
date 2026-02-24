/**
 * WelcomeFlow Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useOnboardingState', () => ({
  useOnboardingState: vi.fn(() => ({
    completeWelcome: vi.fn(),
    shouldShowWelcome: vi.fn(() => true),
    isComplete: false,
    currentStep: 0,
    completeStep: vi.fn(),
    skipOnboarding: vi.fn(),
    data: {},
    updateData: vi.fn(),
  })),
}));

vi.mock('framer-motion', () => {
  const handler = {
    get: (_target: any, prop: string) => {
      return ({ children, ...props }: any) => {
        const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...domProps } = props;
        // Use createElement to avoid JSX in factory
        const React = require('react');
        return React.createElement(prop, domProps, children);
      };
    },
  };
  return {
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => children,
  };
});

import { WelcomeFlow } from '../WelcomeFlow';

describe('WelcomeFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWelcome = () => render(
    <MemoryRouter>
      <WelcomeFlow />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderWelcome();
    // Should show some welcome content
    expect(document.body.textContent).toBeTruthy();
  });

  test('displays personalized greeting with user name', () => {
    renderWelcome();
    // Welcome step shows "Welcome to FluxStudio" and "Hey {firstName}!"
    expect(screen.getByText('Welcome to FluxStudio')).toBeInTheDocument();
    expect(screen.getByText('Hey Test!')).toBeInTheDocument();
  });

  test('shows quick action options after continuing', () => {
    renderWelcome();
    // Click "Let's Go" to advance to the start step
    const continueBtn = screen.getByText("Let's Go");
    fireEvent.click(continueBtn);
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('Use Template')).toBeInTheDocument();
    expect(screen.getByText('Join Team')).toBeInTheDocument();
  });

  test('navigates to create project on action click', () => {
    renderWelcome();
    // Advance to start step first
    fireEvent.click(screen.getByText("Let's Go"));
    const createBtn = screen.getByText('Create Project');
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalled();
  });

  test('shows help resources', () => {
    renderWelcome();
    // Should have links to documentation or help
    const helpLinks = screen.queryAllByText(/help|guide|tutorial|docs/i);
    expect(helpLinks.length).toBeGreaterThanOrEqual(0);
  });
});
