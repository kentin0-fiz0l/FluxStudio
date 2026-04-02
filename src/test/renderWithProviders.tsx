/* eslint-disable react-refresh/only-export-components */
/**
 * Enhanced Test Render with Providers
 *
 * Wraps components with all required providers (QueryClient, Router, Zustand store)
 * for integration-level component testing.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

export { userEvent };

// ---------------------------------------------------------------------------
// Query Client
// ---------------------------------------------------------------------------

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  /** Use MemoryRouter with initial entries instead of BrowserRouter */
  initialEntries?: string[];
  /** Initial route path */
  route?: string;
}

// ---------------------------------------------------------------------------
// Providers wrapper factory
// ---------------------------------------------------------------------------

function createWrapper(options: RenderWithProvidersOptions = {}) {
  const client = options.queryClient ?? createTestQueryClient();
  const entries = options.initialEntries ?? (options.route ? [options.route] : undefined);

  return function Wrapper({ children }: { children: React.ReactNode }) {
    const Router = entries ? (
      <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
    ) : (
      <BrowserRouter>{children}</BrowserRouter>
    );

    return (
      <QueryClientProvider client={client}>
        {Router}
      </QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// renderWithProviders
// ---------------------------------------------------------------------------

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { queryClient, initialEntries, route, ...renderOptions } = options;
  const Wrapper = createWrapper({ queryClient, initialEntries, route });
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
