import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mock } from 'node:test';

// Resolve CLI root: helpers.js is at cli/tests/helpers.js → cli/ is one dir up
const CLI_ROOT = join(import.meta.dirname, '..');

/**
 * Create a temp directory to use as HOME, so config/auth modules
 * read from/write to an isolated .fluxstudio/ dir.
 */
export function createTempHome() {
  const dir = mkdtempSync(join(tmpdir(), 'flux-test-'));
  return dir;
}

export function cleanupTempHome(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

/**
 * Dynamically import a module with HOME overridden, so that
 * homedir()-based paths point to our temp dir.
 * Uses a cache-busting query param to get a fresh module instance.
 *
 * @param {string} relPath - Path relative to cli/ root, e.g. 'lib/config.js'
 */
let _importCounter = 0;
export async function importFresh(relPath) {
  _importCounter++;
  const absPath = join(CLI_ROOT, relPath);
  const url = pathToFileURL(absPath).href;
  return import(`${url}?t=${_importCounter}`);
}

/**
 * Set up a mock for globalThis.fetch that returns queued responses.
 * Each entry in `responses` should be { status, body, ok? }.
 * Returns the mock function for assertions.
 */
export function mockFetch(responses = []) {
  let callIndex = 0;
  const calls = [];

  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    const entry = responses[callIndex++] || { status: 200, body: {} };
    const ok = entry.ok ?? (entry.status >= 200 && entry.status < 300);
    return {
      ok,
      status: entry.status || 200,
      json: async () => entry.body,
    };
  };

  const m = mock.method(globalThis, 'fetch', fakeFetch);
  return { mock: m, calls };
}

/**
 * Capture console.log and console.error output.
 * Returns an object with .logs, .errors arrays and a .restore() method.
 */
export function captureConsole() {
  const logs = [];
  const errors = [];
  const warns = [];

  const logMock = mock.method(console, 'log', (...args) => {
    logs.push(args.map(String).join(' '));
  });
  const errorMock = mock.method(console, 'error', (...args) => {
    errors.push(args.map(String).join(' '));
  });
  const warnMock = mock.method(console, 'warn', (...args) => {
    warns.push(args.map(String).join(' '));
  });

  return {
    logs,
    errors,
    warns,
    restore() {
      logMock.mock.restore();
      errorMock.mock.restore();
      warnMock.mock.restore();
    },
  };
}

/**
 * Mock process.exit to prevent test runner from exiting.
 * Returns the mock for assertions.
 */
export function mockProcessExit() {
  return mock.method(process, 'exit', () => {});
}

/**
 * Write test credentials to the REAL ~/.fluxstudio/ directory.
 * This is needed for tests that exercise modules which internally
 * import auth.js via static imports (client.js, commands/*), since
 * those imports resolve to the originally cached auth module.
 *
 * Call backupRealCredentials() before and restoreRealCredentials() after.
 */
const REAL_CONFIG_DIR = join(homedir(), '.fluxstudio');
const REAL_CREDS_FILE = join(REAL_CONFIG_DIR, 'credentials.json');
let _credsBackup = null;

export function backupRealCredentials() {
  try {
    _credsBackup = readFileSync(REAL_CREDS_FILE, 'utf8');
  } catch {
    _credsBackup = null;
  }
}

export function restoreRealCredentials() {
  if (_credsBackup !== null) {
    writeFileSync(REAL_CREDS_FILE, _credsBackup, { mode: 0o600 });
  } else {
    try { unlinkSync(REAL_CREDS_FILE); } catch { /* no-op */ }
  }
  _credsBackup = null;
}

export function writeTestCredentials(creds) {
  mkdirSync(REAL_CONFIG_DIR, { recursive: true });
  writeFileSync(
    REAL_CREDS_FILE,
    JSON.stringify(creds, null, 2) + '\n',
    { mode: 0o600 }
  );
}
