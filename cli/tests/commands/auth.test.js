import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  importFresh,
  mockFetch,
  captureConsole,
  mockProcessExit,
  backupRealCredentials,
  restoreRealCredentials,
  writeTestCredentials,
} from '../helpers.js';

describe('commands/auth', () => {
  let captured;
  let exitMock;

  beforeEach(() => {
    backupRealCredentials();
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

  describe('login', () => {
    it('calls POST /api/auth/login and saves credentials', async () => {
      const { calls } = mockFetch([
        {
          status: 200,
          body: {
            data: {
              accessToken: 'tok123',
              refreshToken: 'ref456',
              expiresAt: Date.now() + 3600_000,
              user: { email: 'test@example.com', name: 'Test User' },
            },
          },
        },
      ]);

      const { login } = await importFresh('commands/auth.js');
      await login(
        { email: 'test@example.com', password: 'pass123' },
        { json: false, server: 'http://localhost:3001' }
      );

      // Verify fetch was called correctly
      assert.ok(calls[0].url.includes('/api/auth/login'));
      const body = JSON.parse(calls[0].opts.body);
      assert.equal(body.email, 'test@example.com');
      assert.equal(body.password, 'pass123');

      // Verify credentials were saved (read from real HOME)
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { homedir } = await import('node:os');
      const creds = JSON.parse(readFileSync(join(homedir(), '.fluxstudio', 'credentials.json'), 'utf8'));
      assert.equal(creds.accessToken, 'tok123');
    });

    it('in JSON mode outputs { success: true, user }', async () => {
      mockFetch([
        {
          status: 200,
          body: {
            data: {
              accessToken: 'tok',
              refreshToken: 'ref',
              user: { email: 'test@example.com' },
            },
          },
        },
      ]);

      const { login } = await importFresh('commands/auth.js');
      await login(
        { email: 'test@example.com', password: 'pass' },
        { json: true, server: 'http://localhost:3001' }
      );

      const output = captured.logs.find((l) => l.includes('success'));
      assert.ok(output);
      const parsed = JSON.parse(output);
      assert.equal(parsed.success, true);
      assert.ok(parsed.user);
    });
  });

  describe('logout', () => {
    it('calls POST /api/auth/logout and clears credentials', async () => {
      writeTestCredentials({
        accessToken: 'tok',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
      });

      const { calls } = mockFetch([
        { status: 200, body: { success: true } },
      ]);

      const { logout } = await importFresh('commands/auth.js');
      await logout({ json: false, server: 'http://localhost:3001' });

      assert.ok(calls[0].url.includes('/api/auth/logout'));

      // Credentials should be cleared
      const { existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { homedir } = await import('node:os');
      const exists = existsSync(join(homedir(), '.fluxstudio', 'credentials.json'));
      assert.equal(exists, false);
    });
  });

  describe('whoami', () => {
    it('calls GET /api/auth/me and prints user info', async () => {
      writeTestCredentials({
        accessToken: 'tok',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
      });

      const { calls } = mockFetch([
        {
          status: 200,
          body: { data: { name: 'Test User', email: 'test@example.com', role: 'admin' } },
        },
      ]);

      const { whoami } = await importFresh('commands/auth.js');
      await whoami({ json: false, server: 'http://localhost:3001' });

      assert.ok(calls[0].url.includes('/api/auth/me'));
      assert.ok(captured.logs.some((l) => l.includes('Test User')));
    });
  });

  describe('status', () => {
    it('shows "Not logged in" when no credentials', async () => {
      // Forcibly remove credentials file
      try { unlinkSync(join(homedir(), '.fluxstudio', 'credentials.json')); } catch { /* no-op */ }

      const { status } = await importFresh('commands/auth.js');
      await status({ json: false, server: 'http://localhost:3001' });

      assert.ok(captured.logs.some((l) => l.includes('Not logged in')));
    });

    it('shows user name when logged in', async () => {
      writeTestCredentials({
        accessToken: 'tok',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
        user: { name: 'Alice', email: 'alice@example.com' },
      });

      const { status } = await importFresh('commands/auth.js');
      await status({ json: false, server: 'http://localhost:3001' });

      assert.ok(captured.logs.some((l) => l.includes('Alice')));
    });

    it('JSON mode shows { loggedIn: false } when not logged in', async () => {
      try { unlinkSync(join(homedir(), '.fluxstudio', 'credentials.json')); } catch { /* no-op */ }

      const { status } = await importFresh('commands/auth.js');
      await status({ json: true, server: 'http://localhost:3001' });

      const output = captured.logs.find((l) => l.includes('loggedIn'));
      assert.ok(output);
      const parsed = JSON.parse(output);
      assert.equal(parsed.loggedIn, false);
    });

    it('JSON mode shows { loggedIn: true } when logged in', async () => {
      writeTestCredentials({
        accessToken: 'tok',
        expiresAt: Date.now() + 3600_000,
        user: { name: 'Alice' },
      });

      const { status } = await importFresh('commands/auth.js');
      await status({ json: true, server: 'http://localhost:3001' });

      const output = captured.logs.find((l) => l.includes('loggedIn'));
      const parsed = JSON.parse(output);
      assert.equal(parsed.loggedIn, true);
    });
  });
});
