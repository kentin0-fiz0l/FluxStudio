import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureConsole, mockProcessExit, importFresh } from '../helpers.js';

describe('lib/errors', () => {
  let captured;
  let exitMock;

  beforeEach(() => {
    captured = captureConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    captured.restore();
    exitMock.mock.restore();
  });

  it('401 → "Authentication required"', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('Unauthorized');
    err.status = 401;
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Authentication required')));
  });

  it('403 → "Permission denied"', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('Forbidden');
    err.status = 403;
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Permission denied')));
  });

  it('404 → "Not found"', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('Missing');
    err.status = 404;
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Not found')));
  });

  it('ECONNREFUSED → "Cannot connect to server"', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('connect ECONNREFUSED');
    err.code = 'ECONNREFUSED';
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Cannot connect to server')));
  });

  it('ENOTFOUND → "Server not found"', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('getaddrinfo ENOTFOUND');
    err.code = 'ENOTFOUND';
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Server not found')));
  });

  it('generic error → error.message', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    const err = new Error('Something unexpected');
    handleError(err);

    assert.ok(captured.errors.some((l) => l.includes('Something unexpected')));
  });

  it('always calls process.exit(1)', async () => {
    const { handleError } = await importFresh('lib/errors.js');
    handleError(new Error('test'));
    handleError(Object.assign(new Error('auth'), { status: 401 }));
    handleError(Object.assign(new Error('conn'), { code: 'ECONNREFUSED' }));

    assert.equal(exitMock.mock.callCount(), 3);
    for (const call of exitMock.mock.calls) {
      assert.equal(call.arguments[0], 1);
    }
  });
});
