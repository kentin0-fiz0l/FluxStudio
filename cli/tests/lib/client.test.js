import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  importFresh,
  mockFetch,
  backupRealCredentials,
  restoreRealCredentials,
  writeTestCredentials,
} from '../helpers.js';

describe('lib/client', () => {
  beforeEach(() => {
    backupRealCredentials();
  });

  afterEach(() => {
    restoreRealCredentials();
    if (globalThis.fetch?.mock) {
      globalThis.fetch.mock.restore();
    }
  });

  function setupAuth(expiresAt) {
    writeTestCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: expiresAt ?? Date.now() + 3600_000,
    });
  }

  it('builds correct URL with base + path', async () => {
    setupAuth();
    const { calls } = mockFetch([{ status: 200, body: { ok: true } }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'https://api.example.com' });
    await client.get('/api/projects', { auth: false });

    assert.equal(calls[0].url, 'https://api.example.com/api/projects');
  });

  it('appends query params and filters nulls', async () => {
    const { calls } = mockFetch([{ status: 200, body: {} }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects', {
      auth: false,
      query: { limit: '10', status: null, search: 'design' },
    });

    const url = calls[0].url;
    assert.ok(url.includes('limit=10'));
    assert.ok(url.includes('search=design'));
    assert.ok(!url.includes('status'));
  });

  it('sets Authorization header when auth=true', async () => {
    setupAuth();
    const { calls } = mockFetch([{ status: 200, body: {} }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/test');

    assert.equal(calls[0].opts.headers['Authorization'], 'Bearer test-token');
  });

  it('skips auth header when auth=false', async () => {
    const { calls } = mockFetch([{ status: 200, body: {} }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/public', { auth: false });

    assert.equal(calls[0].opts.headers['Authorization'], undefined);
  });

  it('sets Content-Type application/json', async () => {
    setupAuth();
    const { calls } = mockFetch([{ status: 200, body: {} }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/test');

    assert.equal(calls[0].opts.headers['Content-Type'], 'application/json');
  });

  it('sends JSON body for POST', async () => {
    setupAuth();
    const { calls } = mockFetch([{ status: 200, body: {} }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.post('/api/projects', { name: 'My Project' });

    const parsed = JSON.parse(calls[0].opts.body);
    assert.equal(parsed.name, 'My Project');
    assert.equal(calls[0].opts.method, 'POST');
  });

  it('throws with message from error response', async () => {
    setupAuth();
    mockFetch([{ status: 400, body: { message: 'Bad input' } }]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });

    await assert.rejects(
      () => client.get('/api/test'),
      (err) => {
        assert.equal(err.message, 'Bad input');
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  it('calls refresh endpoint when token is expiring', async () => {
    // Token expires in 30s → isTokenExpiringSoon() returns true
    setupAuth(Date.now() + 30_000);

    const { calls } = mockFetch([
      // First call: refresh
      { status: 200, body: { data: { accessToken: 'new-token', refreshToken: 'new-refresh', expiresAt: Date.now() + 3600_000 } } },
      // Second call: actual request
      { status: 200, body: { data: [] } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects');

    assert.ok(calls[0].url.includes('/api/auth/refresh'));
    assert.ok(calls[1].url.includes('/api/projects'));
  });

  it('saves refreshed token to credentials', async () => {
    setupAuth(Date.now() + 30_000);

    mockFetch([
      { status: 200, body: { data: { accessToken: 'refreshed-tok', refreshToken: 'refreshed-ref', expiresAt: Date.now() + 7200_000 } } },
      { status: 200, body: {} },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/test');

    // Read back from the real credentials file
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const credsPath = join(homedir(), '.fluxstudio', 'credentials.json');
    const creds = JSON.parse(readFileSync(credsPath, 'utf8'));
    assert.equal(creds.accessToken, 'refreshed-tok');
    assert.equal(creds.refreshToken, 'refreshed-ref');
  });
});
