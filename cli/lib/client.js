import { getServerUrl } from './config.js';
import {
  getCredentials,
  saveCredentials,
  getAccessToken,
  getRefreshToken,
  isTokenExpiringSoon,
} from './auth.js';

class FluxClient {
  constructor(globalOpts = {}) {
    this.baseUrl = getServerUrl(globalOpts.server);
  }

  async ensureAuth() {
    if (isTokenExpiringSoon()) {
      await this.refreshToken();
    }
  }

  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Not logged in. Run: flux login');
    }

    const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      throw new Error('Session expired. Please run: flux login');
    }

    const body = await res.json();
    const data = body.data || body;

    const creds = getCredentials();
    saveCredentials({
      ...creds,
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken || refreshToken,
      expiresAt: data.expiresAt || Date.now() + 3600_000,
    });
  }

  async request(method, path, { body, query, auth = true } = {}) {
    if (auth) {
      await this.ensureAuth();
    }

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v != null)
      );
      if (params.toString()) url += `?${params}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.response = json;
      throw err;
    }

    return json;
  }

  async upload(path, filePath, { field = 'file', extraFields = {} } = {}) {
    const { basename } = await import('node:path');
    const { readFileSync } = await import('node:fs');

    await this.ensureAuth();
    const fileBuffer = readFileSync(filePath);
    const fileName = basename(filePath);

    const formData = new FormData();
    formData.append(field, new Blob([fileBuffer]), fileName);
    for (const [k, v] of Object.entries(extraFields)) {
      formData.append(k, v);
    }

    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.response = json;
      throw err;
    }

    return json;
  }

  get(path, opts) {
    return this.request('GET', path, opts);
  }
  post(path, body, opts) {
    return this.request('POST', path, { body, ...opts });
  }
  put(path, body, opts) {
    return this.request('PUT', path, { body, ...opts });
  }
  patch(path, body, opts) {
    return this.request('PATCH', path, { body, ...opts });
  }
  delete(path, opts) {
    return this.request('DELETE', path, opts);
  }
}

let _instance;

export function getClient(globalOpts) {
  if (!_instance || globalOpts) {
    _instance = new FluxClient(globalOpts);
  }
  return _instance;
}
