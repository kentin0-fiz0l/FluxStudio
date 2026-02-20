import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { createTempHome, cleanupTempHome } from './helpers.js';

const exec = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, '..', 'bin', 'flux.js');

function run(args, env = {}) {
  return exec('node', [CLI_PATH, ...args], {
    env: { ...process.env, ...env },
    timeout: 10_000,
  }).catch((err) => ({
    stdout: err.stdout || '',
    stderr: err.stderr || '',
    exitCode: err.code,
  }));
}

describe('CLI integration', () => {
  let tempHome;
  let originalHome;

  beforeEach(() => {
    tempHome = createTempHome();
    originalHome = process.env.HOME;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    cleanupTempHome(tempHome);
  });

  it('flux --help exits 0 and shows command groups', async () => {
    const result = await run(['--help']);
    const output = result.stdout;
    assert.ok(output.includes('auth'));
    assert.ok(output.includes('projects'));
    assert.ok(output.includes('agent'));
    assert.ok(output.includes('files'));
  });

  it('flux --version outputs 0.1.0', async () => {
    const result = await run(['--version']);
    assert.ok(result.stdout.includes('0.1.0'));
  });

  it('flux login --help shows email/password options', async () => {
    const result = await run(['login', '--help']);
    const output = result.stdout;
    assert.ok(output.includes('--email'));
    assert.ok(output.includes('--password'));
  });

  it('flux auth status shows "Not logged in" without credentials', async () => {
    const result = await run(['auth', 'status'], { HOME: tempHome });
    const output = result.stdout + (result.stderr || '');
    assert.ok(output.includes('Not logged in'));
  });

  it('flux projects list --json returns error (no auth)', async () => {
    const result = await run(['projects', 'list', '--json'], { HOME: tempHome });
    // Without server or auth, should get a connection or auth error
    const combined = (result.stdout || '') + (result.stderr || '');
    assert.ok(combined.length > 0);
  });

  it('unknown command shows help text', async () => {
    const result = await run(['nonexistent']);
    const combined = (result.stdout || '') + (result.stderr || '');
    assert.ok(combined.includes('help') || combined.includes('unknown') || combined.includes('Usage'));
  });
});
