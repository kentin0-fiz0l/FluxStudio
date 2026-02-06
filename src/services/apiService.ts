/**
 * FluxStudio API Service
 * Centralized API communication with proper error handling and authentication
 */

import { buildApiUrl, buildAuthUrl, buildMessagingUrl, config } from '../config/environment';
import {
  validate,
  createOrganizationSchema,
  updateOrganizationSchema,
  createTeamSchema,
  updateTeamSchema,
  createProjectSchema,
  updateProjectSchema,
  fileMetadataSchema,
  sendMessageSchema,
  quickPrintSchema,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateTeamInput,
  UpdateTeamInput,
  CreateProjectInput,
  UpdateProjectInput,
  FileMetadataInput,
  SendMessageInput,
  QuickPrintInput,
} from './apiValidation';

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

        // Handle authentication errors - 401 Unauthorized or 403 with auth message
        if (response.status === 401 ||
            (response.status === 403 && (
              errorData.message?.toLowerCase().includes('token') ||
              errorData.message?.toLowerCase().includes('unauthorized') ||
              errorData.message?.toLowerCase().includes('authentication') ||
              errorData.error === 'INVALID_TOKEN'
            ))) {
          this.handleAuthError();
          throw new Error('Authentication required. Please sign in again.');
        }

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

  /**
   * Handle authentication errors by clearing token and redirecting to login
   */
  private handleAuthError(): void {
    localStorage.removeItem('auth_token');
    this.clearCsrfToken();
    // Dispatch custom event so app can respond (e.g., show toast, clear state)
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=session_expired';
    }
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

  // Generic HTTP methods for flexible API access
  async get<T = any>(endpoint: string, options: { params?: Record<string, string> } = {}): Promise<ApiResponse<T>> {
    let url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }
    return this.makeRequest<T>(url, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options: { headers?: Record<string, string> } = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    const isFormData = data instanceof FormData;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : options.headers,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    return this.makeRequest<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    return this.makeRequest<T>(url, { method: 'DELETE' });
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

  async createOrganization(data: CreateOrganizationInput) {
    const validated = validate(createOrganizationSchema, data);
    return this.makeRequest(buildApiUrl('/organizations'), {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  async updateOrganization(id: string, data: UpdateOrganizationInput) {
    const validated = validate(updateOrganizationSchema, data);
    return this.makeRequest(buildApiUrl(`/organizations/${id}`), {
      method: 'PUT',
      body: JSON.stringify(validated),
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

  async createTeam(organizationId: string, data: CreateTeamInput) {
    const validated = validate(createTeamSchema, data);
    return this.makeRequest(buildApiUrl(`/organizations/${organizationId}/teams`), {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  async updateTeam(id: string, data: UpdateTeamInput) {
    const validated = validate(updateTeamSchema, data);
    return this.makeRequest(buildApiUrl(`/teams/${id}`), {
      method: 'PUT',
      body: JSON.stringify(validated),
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

  async createProject(data: CreateProjectInput) {
    const validated = validate(createProjectSchema, data);
    return this.makeRequest(buildApiUrl('/projects'), {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  async updateProject(id: string, data: UpdateProjectInput) {
    const validated = validate(updateProjectSchema, data);
    return this.makeRequest(buildApiUrl(`/projects/${id}`), {
      method: 'PUT',
      body: JSON.stringify(validated),
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

  async uploadFile(projectId: string, file: File, metadata?: FileMetadataInput) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      const validatedMetadata = validate(fileMetadataSchema, metadata);
      formData.append('metadata', JSON.stringify(validatedMetadata));
    }

    // makeRequest automatically handles CSRF token and auth headers for FormData
    return this.makeRequest(buildApiUrl(`/projects/${projectId}/files`), {
      method: 'POST',
      body: formData,
    });
  }

  async updateFile(id: string, data: FileMetadataInput) {
    const validated = validate(fileMetadataSchema, data);
    return this.makeRequest(buildApiUrl(`/files/${id}`), {
      method: 'PUT',
      body: JSON.stringify(validated),
    });
  }

  async deleteFile(id: string) {
    return this.makeRequest(buildApiUrl(`/files/${id}`), {
      method: 'DELETE',
    });
  }

  async uploadMultipleFiles(
    projectId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Get headers with auth and CSRF token before creating Promise
    const headers = await this.getDefaultHeaders(true, true, false);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = buildApiUrl(`/projects/${projectId}/files/upload`);

      // Setup progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              data,
              message: data.message,
            });
          } catch (_error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Open connection and set headers
      xhr.open('POST', url);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
      xhr.withCredentials = true;

      // Send the request
      xhr.send(formData);
    });
  }

  // Printing API calls
  async quickPrint(input: QuickPrintInput) {
    const validated = validate(quickPrintSchema, input);
    return this.makeRequest(buildApiUrl('/printing/quick-print'), {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  // Messaging API calls
  async getMessages(channelId?: string) {
    const url = channelId
      ? buildMessagingUrl(`/messages?channelId=${channelId}`)
      : buildMessagingUrl('/messages');
    return this.makeRequest(url);
  }

  async sendMessage(data: SendMessageInput) {
    const validated = validate(sendMessageSchema, data);
    return this.makeRequest(buildMessagingUrl('/messages'), {
      method: 'POST',
      body: JSON.stringify(validated),
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