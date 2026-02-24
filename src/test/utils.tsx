/* eslint-disable react-refresh/only-export-components */
/**
 * Shared Test Utilities for FluxStudio
 * Custom render, store helpers, and mock helpers.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// ---------------------------------------------------------------------------
// Query Client for tests
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
// Providers wrapper
// ---------------------------------------------------------------------------

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Custom render
// ---------------------------------------------------------------------------

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { queryClient, ...renderOptions } = options;
  const Wrapper = createWrapper(queryClient);
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export { customRender as render };

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

export function mockApiResponse<T>(data: T, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

export function mockFetchSequence(...responses: Array<ReturnType<typeof mockApiResponse>>) {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  return fn;
}

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.png',
  role: 'admin',
  organizationId: 'org-1',
  createdAt: '2025-01-01T00:00:00.000Z',
};

export const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'A test project',
  status: 'in_progress' as const,
  priority: 'medium' as const,
  progress: 50,
  startDate: '2025-01-01',
  dueDate: '2025-06-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ownerId: 'user-1',
  organizationId: 'org-1',
  members: ['user-1', 'user-2'],
  tags: ['design', 'frontend'],
};
