/**
 * FluxStudio API Service
 * Centralized API communication with proper error handling and authentication
 */

import { buildApiUrl, buildAuthUrl, buildMessagingUrl, config } from '../config/environment';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Request configuration
interface RequestConfig extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
}

class ApiService {
  private defaultTimeout = config.API_TIMEOUT;
  private maxRetries = 3;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;

  /**
   * Initialize CSRF token on app startup
   * Call this in your app's initialization (e.g., App.tsx useEffect)
   */
  async initializeCsrfToken(): Promise<void> {
    try {
      await this.getCsrfToken();
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error);
    }
  }

  /**
   * Get CSRF token from server
   * Caches the token to avoid multiple requests
   */
  private async getCsrfToken(): Promise<string> {
    // Return cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Return existing promise if already fetching
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    // Fetch new CSRF token
    this.csrfTokenPromise = fetch(buildApiUrl('/csrf-token'), {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }
        const data = await response.json();
        this.csrfToken = data.csrfToken;
        this.csrfTokenPromise = null;
        return data.csrfToken;
      })
      .catch((error) => {
        this.csrfTokenPromise = null;
        throw error;
      });

    return this.csrfTokenPromise;
  }

  /**
   * Clear cached CSRF token (e.g., on 403 CSRF error)
   */
  private clearCsrfToken(): void {
    this.csrfToken = null;
    this.csrfTokenPromise = null;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async getDefaultHeaders(
    includeAuth: boolean = true,
    requireCsrf: boolean = false,
    includeContentType: boolean = true
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add CSRF token for state-changing requests
    if (requireCsrf) {
      try {
        const csrfToken = await this.getCsrfToken();
        headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
        // Continue without CSRF token - server will reject if required
      }
    }

    return headers;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      requireAuth = true,
      timeout = this.defaultTimeout,
      retries = this.maxRetries,
      ...fetchOptions
    } = options;

    // Determine if CSRF token is needed (POST, PUT, DELETE, PATCH)
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const requireCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    // Detect FormData - don't set Content-Type header (browser will set with boundary)
    const isFormData = fetchOptions.body instanceof FormData;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const defaultHeaders = await this.getDefaultHeaders(requireAuth, requireCsrf, !isFormData);
      const headers = {
        ...defaultHeaders,
        ...fetchOptions.headers,
      };

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle CSRF token errors
        if (response.status === 403 && errorData.error === 'CSRF_TOKEN_INVALID') {
          // Clear cached CSRF token and retry once
          this.clearCsrfToken();
          if (retries > 0) {
            console.warn('CSRF token invalid, refreshing and retrying...');
            return this.makeRequest(url, { ...options, retries: retries - 1 });
          }
        }

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          throw new Error('Authentication required');
        }

        // Retry logic for network errors
        if (retries > 0 && (error.message.includes('fetch') || error.message.includes('network'))) {
          console.warn(`Request failed, retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
          await this.delay(1000 * (this.maxRetries - retries + 1)); // Exponential backoff
          return this.makeRequest(url, { ...options, retries: retries - 1 });
        }

        throw error;
      }

      throw new Error('An unexpected error occurred');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication API calls
  async login(email: string, password: string) {
    return this.makeRequest(buildAuthUrl('/login'), {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string, userType: string) {
    return this.makeRequest(buildAuthUrl('/signup'), {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password, name, userType }),
    });
  }

  async loginWithGoogle(credential: string) {
    return this.makeRequest(buildAuthUrl('/google'), {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ credential }),
    });
  }

  async logout() {
    return this.makeRequest(buildAuthUrl('/logout'), {
      method: 'POST',
    });
  }

  async getMe() {
    return this.makeRequest(buildAuthUrl('/me'));
  }

  // Organization API calls
  async getOrganizations() {
    return this.makeRequest(buildApiUrl('/organizations'));
  }

  async createOrganization(data: any) {
    return this.makeRequest(buildApiUrl('/organizations'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(id: string, data: any) {
    return this.makeRequest(buildApiUrl(`/organizations/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(id: string) {
    return this.makeRequest(buildApiUrl(`/organizations/${id}`), {
      method: 'DELETE',
    });
  }

  // Team API calls
  async getTeams(organizationId: string) {
    return this.makeRequest(buildApiUrl(`/organizations/${organizationId}/teams`));
  }

  async createTeam(organizationId: string, data: any) {
    return this.makeRequest(buildApiUrl(`/organizations/${organizationId}/teams`), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: any) {
    return this.makeRequest(buildApiUrl(`/teams/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.makeRequest(buildApiUrl(`/teams/${id}`), {
      method: 'DELETE',
    });
  }

  // Project API calls
  async getProjects(organizationId?: string, teamId?: string) {
    let url = buildApiUrl('/projects');
    const params = new URLSearchParams();

    if (organizationId) params.append('organizationId', organizationId);
    if (teamId) params.append('teamId', teamId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  async createProject(data: any) {
    return this.makeRequest(buildApiUrl('/projects'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.makeRequest(buildApiUrl(`/projects/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.makeRequest(buildApiUrl(`/projects/${id}`), {
      method: 'DELETE',
    });
  }

  // File API calls
  async getFiles(projectId: string) {
    return this.makeRequest(buildApiUrl(`/projects/${projectId}/files`));
  }

  async uploadFile(projectId: string, file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // makeRequest automatically handles CSRF token and auth headers for FormData
    return this.makeRequest(buildApiUrl(`/projects/${projectId}/files`), {
      method: 'POST',
      body: formData,
    });
  }

  async updateFile(id: string, data: any) {
    return this.makeRequest(buildApiUrl(`/files/${id}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFile(id: string) {
    return this.makeRequest(buildApiUrl(`/files/${id}`), {
      method: 'DELETE',
    });
  }

  async uploadMultipleFiles(projectId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    // makeRequest automatically handles CSRF token and auth headers for FormData
    return this.makeRequest(buildApiUrl(`/projects/${projectId}/files/upload`), {
      method: 'POST',
      body: formData,
    });
  }

  // Printing API calls
  async quickPrint(filename: string, projectId: string, config: any) {
    return this.makeRequest(buildApiUrl('/printing/quick-print'), {
      method: 'POST',
      body: JSON.stringify({
        filename,
        projectId,
        config,
      }),
    });
  }

  // Messaging API calls
  async getMessages(channelId?: string) {
    const url = channelId
      ? buildMessagingUrl(`/messages?channelId=${channelId}`)
      : buildMessagingUrl('/messages');
    return this.makeRequest(url);
  }

  async sendMessage(data: any) {
    return this.makeRequest(buildMessagingUrl('/messages'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    return this.makeRequest(buildApiUrl('/health'), {
      requireAuth: false,
      timeout: 5000,
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;