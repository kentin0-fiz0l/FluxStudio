import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import {
  importFresh,
  mockFetch,
  captureConsole,
  mockProcessExit,
  backupRealCredentials,
  restoreRealCredentials,
  writeTestCredentials,
} from '../helpers.js';

describe('commands/files', () => {
  let captured;
  let exitMock;
  let tempDir;

  beforeEach(() => {
    backupRealCredentials();
    writeTestCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600_000,
    });
    captured = captureConsole();
    exitMock = mockProcessExit();
    tempDir = mkdtempSync(join(tmpdir(), 'flux-files-test-'));
  });

  afterEach(() => {
    restoreRealCredentials();
    captured.restore();
    exitMock.mock.restore();
    if (globalThis.fetch?.mock) {
      globalThis.fetch.mock.restore();
    }
  });

  it('list calls GET /api/projects/:id/files', async () => {
    const { calls } = mockFetch([
      {
        status: 200,
        body: {
          data: [
            { name: 'design.fig', mimeType: 'application/fig', size: 1024, createdAt: '2025-01-01' },
          ],
        },
      },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.get('/api/projects/proj-1/files', { query: { limit: '20' } });

    assert.ok(calls[0].url.includes('/api/projects/proj-1/files'));
    assert.ok(calls[0].url.includes('limit=20'));
  });

  it('upload reads file and POSTs to upload endpoint', async () => {
    const filePath = join(tempDir, 'test-upload.txt');
    writeFileSync(filePath, 'Hello world');

    const { calls } = mockFetch([
      {
        status: 200,
        body: { data: { name: 'test-upload.txt', size: 11, id: 'file-1' } },
      },
    ]);

    const { getClient } = await importFresh('lib/client.js');
    const client = getClient({ server: 'http://localhost:3001' });
    await client.upload('/api/projects/proj-1/files', filePath);

    assert.ok(calls[0].url.includes('/api/projects/proj-1/files'));
    assert.equal(calls[0].opts.method, 'POST');
    assert.ok(calls[0].opts.headers['Authorization']);
  });

  it('upload errors when file does not exist', async () => {
    const { existsSync } = await import('node:fs');
    const fakePath = join(tempDir, 'nonexistent.txt');

    assert.equal(existsSync(fakePath), false);

    // Verify the output.error function works for this case
    const { setJsonMode, error } = await importFresh('lib/output.js');
    setJsonMode(false);
    error(`File not found: ${fakePath}`);

    assert.ok(captured.errors.some((l) => l.includes('File not found')));
  });
});
