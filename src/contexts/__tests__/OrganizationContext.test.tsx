/**
 * OrganizationContext Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const { mockFetchOrganizations, mockResetOrg, mockUseStore } = vi.hoisted(() => {
  const mockFetchOrganizations = vi.fn();
  const mockResetOrg = vi.fn();

  const defaultSelector = (selector: (state: any) => any) => {
    const state = {
      auth: {
        isAuthenticated: true,
        user: { id: 'user-1', name: 'Test User' },
      },
      org: {
        fetchOrganizations: mockFetchOrganizations,
        resetOrg: mockResetOrg,
        currentOrganization: null,
        organizations: [],
        teams: [],
        projects: [],
        isLoading: false,
      },
    };
    return selector(state);
  };

  const mockUseStore = vi.fn(defaultSelector);

  return { mockFetchOrganizations, mockResetOrg, mockUseStore };
});

vi.mock('../../store', () => ({
  useStore: mockUseStore,
}));

vi.mock('../../store/slices/orgSlice', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: null,
    organizations: [],
    teams: [],
    projects: [],
    isLoading: false,
    fetchOrganizations: mockFetchOrganizations,
    resetOrg: mockResetOrg,
  })),
}));

import { OrganizationProvider } from '../OrganizationContext';

describe('OrganizationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset to authenticated state
    mockUseStore.mockImplementation((selector: (state: any) => any) => {
      const state = {
        auth: {
          isAuthenticated: true,
          user: { id: 'user-1', name: 'Test User' },
        },
        org: {
          fetchOrganizations: mockFetchOrganizations,
          resetOrg: mockResetOrg,
        },
      };
      return selector(state);
    });
  });

  it('renders children', () => {
    const { getByText } = render(
      <OrganizationProvider>
        <div>Hello Child</div>
      </OrganizationProvider>
    );
    expect(getByText('Hello Child')).toBeInTheDocument();
  });

  it('calls fetchOrganizations when authenticated', () => {
    render(
      <OrganizationProvider>
        <div />
      </OrganizationProvider>
    );

    expect(mockFetchOrganizations).toHaveBeenCalledTimes(1);
  });

  it('calls resetOrg when not authenticated', () => {
    mockUseStore.mockImplementation((selector: (state: any) => any) => {
      const state = {
        auth: {
          isAuthenticated: false,
          user: null,
        },
        org: {
          fetchOrganizations: mockFetchOrganizations,
          resetOrg: mockResetOrg,
        },
      };
      return selector(state);
    });

    render(
      <OrganizationProvider>
        <div />
      </OrganizationProvider>
    );

    expect(mockResetOrg).toHaveBeenCalledTimes(1);
    expect(mockFetchOrganizations).not.toHaveBeenCalled();
  });
});

describe('useOrganization', () => {
  it('is re-exported from orgSlice', async () => {
    const orgContextModule = await import('../OrganizationContext');
    expect(orgContextModule.useOrganization).toBeDefined();
  });
});
