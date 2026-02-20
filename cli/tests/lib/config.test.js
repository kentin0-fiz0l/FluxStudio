import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTempHome, cleanupTempHome, importFresh } from '../helpers.js';

describe('lib/config', () => {
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

  it('returns defaults when no config file exists', async () => {
    const { getConfig } = await importFresh('lib/config.js');
    const config = getConfig();
    assert.equal(config.serverUrl, 'http://localhost:3001');
  });

  it('writes and reads config correctly', async () => {
    const { setConfig, getConfig } = await importFresh('lib/config.js');
    setConfig({ serverUrl: 'https://api.example.com' });

    const config = getConfig();
    assert.equal(config.serverUrl, 'https://api.example.com');
  });

  it('setConfig merges with existing config', async () => {
    const { setConfig, getConfig } = await importFresh('lib/config.js');
    setConfig({ serverUrl: 'https://example.com' });
    setConfig({ customField: 'hello' });

    const config = getConfig();
    assert.equal(config.serverUrl, 'https://example.com');
    assert.equal(config.customField, 'hello');
  });

  it('getServerUrl strips trailing slashes', async () => {
    const { setConfig, getServerUrl } = await importFresh('lib/config.js');
    setConfig({ serverUrl: 'https://example.com///' });

    const url = getServerUrl();
    assert.equal(url, 'https://example.com');
  });

  it('getServerUrl prefers CLI override over stored config', async () => {
    const { setConfig, getServerUrl } = await importFresh('lib/config.js');
    setConfig({ serverUrl: 'https://stored.example.com' });

    const url = getServerUrl('https://override.example.com/');
    assert.equal(url, 'https://override.example.com');
  });
});
