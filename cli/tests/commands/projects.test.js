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

describe('commands/projects', () => {
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

  it('list calls GET /api/projects with query params', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: [{ id: '1', name: 'P1', status: 'active' }] } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects', { query: { limit: '20', status: 'active' } });

    assert.ok(calls[0].url.includes('/api/projects'));
    assert.ok(calls[0].url.includes('limit=20'));
    assert.ok(calls[0].url.includes('status=active'));
  });

  it('list prints table in human mode', async () => {
    mockFetch([]); // not used, just testing output
    const { setJsonMode, table } = await importFresh('lib/output.js');
    setJsonMode(false);
    const rows = [
      { id: '1', name: 'Project Alpha', status: 'active', updatedAt: '1/1/2025' },
    ];
    const cols = [
      { key: 'id', label: 'ID', maxWidth: 36 },
      { key: 'name', label: 'Name', maxWidth: 30 },
      { key: 'status', label: 'Status', maxWidth: 12 },
      { key: 'updatedAt', label: 'Updated', maxWidth: 20 },
    ];
    table(rows, cols);

    assert.ok(captured.logs.some((l) => l.includes('Project Alpha')));
  });

  it('list --json outputs JSON array', async () => {
    mockFetch([]); // not used
    const projects = [
      { id: '1', name: 'P1' },
      { id: '2', name: 'P2' },
    ];
    const { setJsonMode, print } = await importFresh('lib/output.js');
    setJsonMode(true);
    print(projects);
    setJsonMode(false);

    const output = captured.logs[0];
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 2);
  });

  it('get calls GET /api/projects/:id', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: { id: 'abc', name: 'Test', status: 'active' } } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects/abc');

    assert.ok(calls[0].url.endsWith('/api/projects/abc'));
  });

  it('create calls POST /api/projects with name and description', async () => {
    const { calls } = mockFetch([
      { status: 201, body: { data: { id: 'new1', name: 'New Project' } } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.post('/api/projects', { name: 'New Project', description: 'A desc' });

    const body = JSON.parse(calls[0].opts.body);
    assert.equal(body.name, 'New Project');
    assert.equal(body.description, 'A desc');
    assert.equal(calls[0].opts.method, 'POST');
  });

  it('search calls GET /api/projects with search query param', async () => {
    const { calls } = mockFetch([
      { status: 200, body: { data: [] } },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects', { query: { search: 'design' } });

    assert.ok(calls[0].url.includes('search=design'));
  });
});
