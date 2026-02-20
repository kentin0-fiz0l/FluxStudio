import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { createTempHome, cleanupTempHome, importFresh } from '../helpers.js';

describe('lib/auth', () => {
  let tempHome;
  let originalHome;

  beforeEach(() => {
    tempHome = createTempHome();
    originalHome = process.env.HOME;
    process.env.HOME = tempHome;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    cleanupTempHome(tempHome);
  });

  it('returns null when no credentials file exists', async () => {
    const { getCredentials } = await importFresh('lib/auth.js');
    assert.equal(getCredentials(), null);
  });

  it('saveCredentials + getCredentials roundtrip', async () => {
    const { saveCredentials, getCredentials } = await importFresh('lib/auth.js');
    const creds = {
      accessToken: 'abc123',
      refreshToken: 'ref456',
      expiresAt: Date.now() + 3600_000,
      user: { email: 'test@example.com' },
    };

    saveCredentials(creds);
    const loaded = getCredentials();

    assert.equal(loaded.accessToken, 'abc123');
    assert.equal(loaded.refreshToken, 'ref456');
    assert.equal(loaded.user.email, 'test@example.com');
  });

  it('clearCredentials removes the file', async () => {
    const { saveCredentials, clearCredentials, getCredentials } =
      await importFresh('lib/auth.js');

    saveCredentials({ accessToken: 'token' });
    assert.ok(getCredentials() !== null);

    clearCredentials();
    assert.equal(getCredentials(), null);
  });

  it('clearCredentials does not throw when file is already gone', async () => {
    const { clearCredentials } = await importFresh('lib/auth.js');
    assert.doesNotThrow(() => clearCredentials());
  });

  it('isLoggedIn returns true when accessToken is present', async () => {
    const { saveCredentials, isLoggedIn } = await importFresh('lib/auth.js');
    saveCredentials({ accessToken: 'token123' });
    assert.equal(!!isLoggedIn(), true);
  });

  it('isLoggedIn returns false when no credentials', async () => {
    const { isLoggedIn } = await importFresh('lib/auth.js');
    assert.equal(!!isLoggedIn(), false);
  });

  it('isTokenExpiringSoon returns true when no expiresAt', async () => {
    const { saveCredentials, isTokenExpiringSoon } = await importFresh('lib/auth.js');
    saveCredentials({ accessToken: 'tok' });
    assert.equal(isTokenExpiringSoon(), true);
  });

  it('isTokenExpiringSoon returns true when <60s remaining', async () => {
    const { saveCredentials, isTokenExpiringSoon } = await importFresh('lib/auth.js');
    saveCredentials({
      accessToken: 'tok',
      expiresAt: Date.now() + 30_000, // 30 seconds left
    });
    assert.equal(isTokenExpiringSoon(), true);
  });

  it('isTokenExpiringSoon returns false when token is fresh', async () => {
    const { saveCredentials, isTokenExpiringSoon } = await importFresh('lib/auth.js');
    saveCredentials({
      accessToken: 'tok',
      expiresAt: Date.now() + 600_000, // 10 minutes left
    });
    assert.equal(isTokenExpiringSoon(), false);
  });

  it('credentials file has 0o600 permissions', async () => {
    const { saveCredentials } = await importFresh('lib/auth.js');
    saveCredentials({ accessToken: 'secret' });

    const credsPath = join(tempHome, '.fluxstudio', 'credentials.json');
    const stat = statSync(credsPath);
    const mode = stat.mode & 0o777;
    assert.equal(mode, 0o600);
  });

  it('getAccessToken returns token when present', async () => {
    const { saveCredentials, getAccessToken } = await importFresh('lib/auth.js');
    saveCredentials({ accessToken: 'mytoken' });
    assert.equal(getAccessToken(), 'mytoken');
  });

  it('getAccessToken returns null when no credentials', async () => {
    const { getAccessToken } = await importFresh('lib/auth.js');
    assert.equal(getAccessToken(), null);
  });

  it('getRefreshToken returns token when present', async () => {
    const { saveCredentials, getRefreshToken } = await importFresh('lib/auth.js');
    saveCredentials({ accessToken: 'a', refreshToken: 'myrefresh' });
    assert.equal(getRefreshToken(), 'myrefresh');
  });

  it('getRefreshToken returns null when no credentials', async () => {
    const { getRefreshToken } = await importFresh('lib/auth.js');
    assert.equal(getRefreshToken(), null);
  });
});
