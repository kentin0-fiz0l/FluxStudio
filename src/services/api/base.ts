/**
 * Base API Service - Core HTTP methods, auth, CSRF, retry logic
 */

import { buildApiUrl, config } from '../../config/environment';
import { apiLogger } from '../../lib/logger';

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

export interface UserSettings {
  notifications?: {
    push?: boolean;
    emailDigest?: boolean;
  };
  appearance?: {
    darkMode?: boolean;
    language?: string;
  };
  performance?: {
    autoSave?: boolean;
  };
}

interface RequestConfig extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
}

export class ApiService {
  private defaultTimeout = config.API_TIMEOUT;
  private maxRetries = 3;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;

  async initializeCsrfToken(): Promise<void> {
    try {
      await this.getCsrfToken();
    } catch (error) {
      apiLogger.warn('Failed to initialize CSRF token', { error });
    }
  }

  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (this.csrfTokenPromise) return this.csrfTokenPromise;

    this.csrfTokenPromise = fetch(buildApiUrl('/csrf-token'), {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch CSRF token');
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

  private clearCsrfToken(): void {
    this.csrfToken = null;
    this.csrfTokenPromise = null;
  }

  resetState(): void {
    this.csrfToken = null;
    this.csrfTokenPromise = null;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  async getDefaultHeaders(
    includeAuth: boolean = true,
    requireCsrf: boolean = false,
    includeContentType: boolean = true
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    if (requireCsrf) {
      try {
        const csrfToken = await this.getCsrfToken();
        headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        apiLogger.error('Failed to get CSRF token', error);
      }
    }
    return headers;
  }

  async makeRequest<T>(
    url: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      requireAuth = true,
      timeout = this.defaultTimeout,
      retries = this.maxRetries,
      ...fetchOptions
    } = options;

    const method = (fetchOptions.method || 'GET').toUpperCase();
    const requireCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const isFormData = fetchOptions.body instanceof FormData;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const defaultHeaders = await this.getDefaultHeaders(requireAuth, requireCsrf, !isFormData);
      const headers = { ...defaultHeaders, ...fetchOptions.headers };

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

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

        if (response.status === 403 && errorData.error === 'CSRF_TOKEN_INVALID') {
          this.clearCsrfToken();
          if (retries > 0) {
            return this.makeRequest(url, { ...options, retries: retries - 1 });
          }
        }

        // Handle rate limiting (429 Too Many Requests)
        if (response.status === 429 && retries > 0) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? (Number(retryAfter) || 1) * 1000
            : Math.min(2000 * Math.pow(2, this.maxRetries - retries), 30000);
          apiLogger.warn('Rate limited, retrying after', { waitMs, retriesLeft: retries - 1 });
          await this.delay(waitMs);
          return this.makeRequest(url, { ...options, retries: retries - 1 });
        }

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data, message: data.message };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') throw new Error('Request timeout');

        if (retries > 0 && (error.message.includes('fetch') || error.message.includes('network'))) {
          await this.delay(1000 * (this.maxRetries - retries + 1));
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

  private handleAuthError(): void {
    this.clearCsrfToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string, options: { params?: Record<string, string> } = {}): Promise<ApiResponse<T>> {
    let url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }
    return this.makeRequest<T>(url, { method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options: { headers?: Record<string, string> } = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    const isFormData = data instanceof FormData;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : options.headers,
    });
  }

  async patch<T = unknown>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    return this.makeRequest<T>(url, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    return this.makeRequest<T>(url, { method: 'DELETE' });
  }

  async healthCheck() {
    return this.makeRequest(buildApiUrl('/health'), { requireAuth: false, timeout: 5000 });
  }
}
