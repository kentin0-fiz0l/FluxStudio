import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

const mockCheckAuth = vi.fn();
const mockLogout = vi.fn();

// Mock the store module that AuthContext imports as '../store'
vi.mock('../../store/store', () => ({
  useStore: vi.fn((selector: (state: any) => any) => {
    const state = {
      auth: {
        checkAuth: mockCheckAuth,
        logout: mockLogout,
      },
    };
    return selector(state);
  }),
}));

// Also mock the barrel export
vi.mock('../../store', () => ({
  useStore: vi.fn((selector: (state: any) => any) => {
    const state = {
      auth: {
        checkAuth: mockCheckAuth,
        logout: mockLogout,
      },
    };
    return selector(state);
  }),
}));

import { AuthProvider } from '../AuthContext';

describe('AuthProvider', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('calls checkAuth on mount', () => {
    render(
      <AuthProvider>
        <div>Child</div>
      </AuthProvider>
    );
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it('renders children', () => {
    const { getByText } = render(
      <AuthProvider>
        <div>Hello Child</div>
      </AuthProvider>
    );
    expect(getByText('Hello Child')).toBeInTheDocument();
  });

  it('registers auth:unauthorized event listener', () => {
    render(
      <AuthProvider>
        <div />
      </AuthProvider>
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'auth:unauthorized',
      expect.any(Function)
    );
  });

  it('removes event listener on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <div />
      </AuthProvider>
    );
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'auth:unauthorized',
      expect.any(Function)
    );
  });

  it('calls logout and redirects on unauthorized event when not on public page', async () => {
    // Set location to a protected page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', href: '/dashboard' },
      writable: true,
      configurable: true,
    });

    mockLogout.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <div />
      </AuthProvider>
    );

    // Find the unauthorized handler and call it
    const call = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'auth:unauthorized'
    );
    const handler = call![1] as EventListener;
    await handler(new Event('auth:unauthorized'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('does not call logout on unauthorized event when on login page', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: '/login' },
      writable: true,
      configurable: true,
    });

    render(
      <AuthProvider>
        <div />
      </AuthProvider>
    );

    const call = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'auth:unauthorized'
    );
    const handler = call![1] as EventListener;
    await handler(new Event('auth:unauthorized'));

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('does not logout when on signup page', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/signup', href: '/signup' },
      writable: true,
      configurable: true,
    });

    render(
      <AuthProvider>
        <div />
      </AuthProvider>
    );

    const call = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'auth:unauthorized'
    );
    const handler = call![1] as EventListener;
    await handler(new Event('auth:unauthorized'));

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
