/**
 * Unit Tests for API Service
 * @file src/services/__tests__/apiService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment config
vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001/api${path}`,
  buildAuthUrl: (path: string) => `http://localhost:3001/api/auth${path}`,
  buildMessagingUrl: (path: string) => `http://localhost:3001/api/messaging${path}`,
  config: {
    API_TIMEOUT: 30000,
  },
}));

// Mock validation
vi.mock('../apiValidation', () => ({
  validate: (_schema: any, data: any) => data,
  createOrganizationSchema: {},
  updateOrganizationSchema: {},
  createTeamSchema: {},
  updateTeamSchema: {},
  createProjectSchema: {},
  updateProjectSchema: {},
  fileMetadataSchema: {},
  sendMessageSchema: {},
  quickPrintSchema: {},
}));

// Import after mocks
import { apiService } from '../apiService';

describe('ApiService', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  // Helper to mock CSRF token response
  const mockCsrfResponse = () => {
    return { ok: true, json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }) };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    localStorage.clear();
    // Reset apiService internal state to prevent test pollution
    apiService.resetState();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Authentication', () => {
    describe('login', () => {
      it('should send login request with credentials', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ token: 'test-token', user: { id: '1' } }),
        };
        // Mock CSRF token fetch first, then actual login response
        mockFetch
          .mockResolvedValueOnce(mockCsrfResponse())
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.login('test@example.com', 'password123');

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
            credentials: 'include',
          })
        );
        expect(result.success).toBe(true);
        expect((result.data as { token: string }).token).toBe('test-token');
      });

      it('should handle login failure', async () => {
        // Use 400 instead of 401 to test non-auth related failure
        // 401 triggers the special auth error handling flow
        const mockResponse = {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        };
        // Mock CSRF token fetch first, then actual login response
        mockFetch
          .mockResolvedValueOnce(mockCsrfResponse())
          .mockResolvedValueOnce(mockResponse);

        await expect(apiService.login('test@example.com', 'wrong')).rejects.toThrow(
          'Invalid credentials'
        );
      });
    });

    describe('signup', () => {
      it('should send signup request with user data', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ token: 'new-token', user: { id: '2' } }),
        };
        // Mock CSRF token fetch first, then actual signup response
        mockFetch
          .mockResolvedValueOnce(mockCsrfResponse())
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.signup(
          'new@example.com',
          'password123',
          'Test User',
          'designer'
        );

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              email: 'new@example.com',
              password: 'password123',
              name: 'Test User',
              userType: 'designer',
            }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('loginWithGoogle', () => {
      it('should send Google OAuth credential', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ token: 'google-token' }),
        };
        // Mock CSRF token fetch first, then actual Google login response
        mockFetch
          .mockResolvedValueOnce(mockCsrfResponse())
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.loginWithGoogle('google-credential');

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/auth/google',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ credential: 'google-credential' }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('getMe', () => {
      it('should fetch current user with auth token', async () => {
        localStorage.setItem('auth_token', 'test-token');
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'Test User' }),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiService.getMe();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/auth/me',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('logout', () => {
      it('should send logout request', async () => {
        localStorage.setItem('auth_token', 'test-token');
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ message: 'Logged out' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.logout();

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Organizations', () => {
    beforeEach(() => {
      localStorage.setItem('auth_token', 'test-token');
    });

    describe('getOrganizations', () => {
      it('should fetch organizations list', async () => {
        const mockOrgs = [{ id: '1', name: 'Org 1' }];
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve(mockOrgs),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiService.getOrganizations();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/organizations',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockOrgs);
      });
    });

    describe('createOrganization', () => {
      it('should create a new organization', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'New Org' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.createOrganization({ name: 'New Org' });

        expect(result.success).toBe(true);
        expect((result.data as { name: string }).name).toBe('New Org');
      });
    });

    describe('updateOrganization', () => {
      it('should update an organization', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'Updated Org' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.updateOrganization('1', { name: 'Updated Org' });

        expect(result.success).toBe(true);
        expect((result.data as { name: string }).name).toBe('Updated Org');
      });
    });

    describe('deleteOrganization', () => {
      it('should delete an organization', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.deleteOrganization('1');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Projects', () => {
    beforeEach(() => {
      localStorage.setItem('auth_token', 'test-token');
    });

    describe('getProjects', () => {
      it('should fetch all projects', async () => {
        const mockProjects = [{ id: '1', name: 'Project 1' }];
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve(mockProjects),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiService.getProjects();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });

      it('should fetch projects with filters', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve([]),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        await apiService.getProjects('org-1', 'team-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects?organizationId=org-1&teamId=team-1',
          expect.any(Object)
        );
      });
    });

    describe('createProject', () => {
      it('should create a new project', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'New Project' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.createProject({
          name: 'New Project',
          type: 'development',
          organizationId: 'org-1',
        });

        expect(result.success).toBe(true);
        expect((result.data as { name: string }).name).toBe('New Project');
      });
    });
  });

  describe('Files', () => {
    beforeEach(() => {
      localStorage.setItem('auth_token', 'test-token');
    });

    describe('getFiles', () => {
      it('should fetch files for a project', async () => {
        const mockFiles = [{ id: '1', name: 'file.png' }];
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve(mockFiles),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiService.getFiles('project-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects/project-1/files',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });
    });

    describe('uploadFile', () => {
      it('should upload a file with FormData', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'uploaded.png' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const file = new File(['content'], 'test.png', { type: 'image/png' });
        const result = await apiService.uploadFile('project-1', file);

        expect(result.success).toBe(true);
        // Verify FormData was sent
        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/projects/project-1/files',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    });

    describe('deleteFile', () => {
      it('should delete a file', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.deleteFile('file-1');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Messaging', () => {
    beforeEach(() => {
      localStorage.setItem('auth_token', 'test-token');
    });

    describe('getMessages', () => {
      it('should fetch messages without channel filter', async () => {
        const mockMessages = [{ id: '1', content: 'Hello' }];
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve(mockMessages),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiService.getMessages();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/messaging/messages',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });

      it('should fetch messages with channel filter', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve([]),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        await apiService.getMessages('channel-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/messaging/messages?channelId=channel-1',
          expect.any(Object)
        );
      });
    });

    describe('sendMessage', () => {
      it('should send a message', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ id: '1', content: 'Test message' }),
        };
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf' }) })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiService.sendMessage({
          conversationId: 'conv-1',
          content: 'Test message',
        });

        expect(result.success).toBe(true);
        expect((result.data as { content: string }).content).toBe('Test message');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // This should retry and eventually succeed
      const result = await apiService.healthCheck();
      expect(result.success).toBe(true);
    });

    it('should handle 401 authentication errors', async () => {
      localStorage.setItem('auth_token', 'expired-token');

      const mockResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Token expired' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      // Mock window.location and dispatchEvent
      const originalLocation = window.location;
      const originalDispatchEvent = window.dispatchEvent;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, pathname: '/dashboard', href: '' },
      });
      window.dispatchEvent = vi.fn();

      await expect(apiService.getMe()).rejects.toThrow('Authentication required');

      // Cleanup
      (window as { location: Location }).location = originalLocation;
      window.dispatchEvent = originalDispatchEvent;
    });

    it('should handle timeout errors', async () => {
      // Test that AbortController is used and AbortError is converted to timeout message
      let capturedSignal: AbortSignal | undefined;
      mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => {
        capturedSignal = options.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          // Simulate abort after a short delay
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 10);
        });
      });

      await expect(apiService.healthCheck()).rejects.toThrow('Request timeout');
      expect(capturedSignal).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should perform health check without auth', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiService.healthCheck();

      expect(result.success).toBe(true);
      expect((result.data as { status: string }).status).toBe('healthy');
    });
  });
});
