import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  importFresh,
  mockFetch,
  captureConsole,
  mockProcessExit,
  backupRealCredentials,
  restoreRealCredentials,
  writeTestCredentials,
} from '../helpers.js';

describe('commands/agent', () => {
  let captured;
  let exitMock;

  beforeEach(() => {
    backupRealCredentials();
    writeTestCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600_000,
    });
    captured = captureConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    restoreRealCredentials();
    captured.restore();
    exitMock.mock.restore();
    if (globalThis.fetch?.mock) {
      globalThis.fetch.mock.restore();
    }
  });

  it('brief calls GET /api/agent/brief/:projectId', async () => {
    const { calls } = mockFetch([
      {
        status: 200,
        body: { data: { project: { name: 'Test' }, description: 'Brief desc', goals: ['Goal 1'] } },
      },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/agent/brief/proj-123');

    assert.ok(calls[0].url.includes('/api/agent/brief/proj-123'));
  });

  it('changes calls GET /api/agent/changes/:projectId with limit', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: [] } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/agent/changes/proj-123', { query: { limit: '5' } });

    assert.ok(calls[0].url.includes('/api/agent/changes/proj-123'));
    assert.ok(calls[0].url.includes('limit=5'));
  });

  it('activity calls GET /api/agent/activity/:projectId', async () => {
    const { calls } = mockFetch([
      {
        status: 200,
        body: {
          data: [
            { action: 'review', description: 'Reviewed design', createdAt: '2025-01-01T00:00:00Z' },
          ],
        },
      },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/agent/activity/proj-123', { query: { limit: '10' } });

    assert.ok(calls[0].url.includes('/api/agent/activity/proj-123'));
  });

  it('actions calls GET /api/agent/actions/:projectId', async () => {
    const { calls } = mockFetch([
      {
        status: 200,
        body: { data: [{ id: 'act-1', type: 'deploy', description: 'Deploy v2', status: 'pending' }] },
      },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/agent/actions/proj-123');

    assert.ok(calls[0].url.includes('/api/agent/actions/proj-123'));
  });

  it('approve calls POST /api/agent/actions/:id/approve', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: { approved: true } } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.post('/api/agent/actions/act-1/approve');

    assert.ok(calls[0].url.includes('/api/agent/actions/act-1/approve'));
    assert.equal(calls[0].opts.method, 'POST');
  });

  it('reject calls POST /api/agent/actions/:id/reject with reason', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: { rejected: true } } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.post('/api/agent/actions/act-1/reject', { reason: 'Not ready' });

    assert.ok(calls[0].url.includes('/api/agent/actions/act-1/reject'));
    const body = JSON.parse(calls[0].opts.body);
    assert.equal(body.reason, 'Not ready');
  });
});
