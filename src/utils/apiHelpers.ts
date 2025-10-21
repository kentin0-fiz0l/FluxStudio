/**
 * API Helper Utilities
 * Centralized URL building and fetch helpers that respect environment configuration
 */

import { buildApiUrl, buildAuthUrl, buildMessagingUrl, config } from '../config/environment';

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Build full API URL for any endpoint
 * Automatically uses environment-aware base URLs
 */
export function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith('/api/auth')) {
    return buildAuthUrl(endpoint.replace('/api/auth', ''));
  } else if (endpoint.startsWith('/api/messaging')) {
    return buildMessagingUrl(endpoint.replace('/api/messaging', ''));
  } else if (endpoint.startsWith('/api')) {
    return buildApiUrl(endpoint.replace('/api', ''));
  }
  return endpoint;
}

/**
 * Enhanced fetch wrapper with authentication and error handling
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint);
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add auth header if token exists and not explicitly disabled
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add content-type for JSON bodies
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Get file URL (for images, downloads, etc.)
 */
export function getFileUrl(path: string): string {
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // If relative path, prepend current origin in production
  if (config.NODE_ENV === 'production') {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // In development, use the API base URL
  return `http://localhost:3001${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Build WebSocket URL
 */
export function getWebSocketUrl(path: string = ''): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  if (config.NODE_ENV === 'production') {
    return `${wsProtocol}//${window.location.host}${path}`;
  }

  return config.SOCKET_URL + path;
}

export default {
  getApiUrl,
  apiFetch,
  getAuthToken,
  getFileUrl,
  getWebSocketUrl,
};
