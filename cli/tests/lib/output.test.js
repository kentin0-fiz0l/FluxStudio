import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureConsole, importFresh } from '../helpers.js';

describe('lib/output', () => {
  let captured;

  beforeEach(() => {
    captured = captureConsole();
  });

  afterEach(() => {
    captured.restore();
  });

  it('setJsonMode(true) causes print() to output JSON', async () => {
    const { setJsonMode, print } = await importFresh('lib/output.js');
    setJsonMode(true);
    print({ hello: 'world' });
    setJsonMode(false);

    assert.ok(captured.logs.length > 0);
    const parsed = JSON.parse(captured.logs[0]);
    assert.equal(parsed.hello, 'world');
  });

  it('print() outputs plain value in human mode', async () => {
    const { setJsonMode, print } = await importFresh('lib/output.js');
    setJsonMode(false);
    print('Hello world');

    assert.ok(captured.logs.some((l) => l.includes('Hello world')));
  });

  it('success() outputs checkmark in human mode', async () => {
    const { setJsonMode, success } = await importFresh('lib/output.js');
    setJsonMode(false);
    success('Done');

    assert.ok(captured.logs.some((l) => l.includes('Done')));
  });

  it('success() outputs nothing in JSON mode', async () => {
    const { setJsonMode, success } = await importFresh('lib/output.js');
    setJsonMode(true);
    success('Done');
    setJsonMode(false);

    assert.equal(captured.logs.length, 0);
  });

  it('error() outputs to stderr in human mode', async () => {
    const { setJsonMode, error } = await importFresh('lib/output.js');
    setJsonMode(false);
    error('Something failed');

    assert.ok(captured.errors.some((l) => l.includes('Something failed')));
  });

  it('error() outputs JSON to stderr in JSON mode', async () => {
    const { setJsonMode, error } = await importFresh('lib/output.js');
    setJsonMode(true);
    error('Something failed');
    setJsonMode(false);

    assert.ok(captured.errors.length > 0);
    const parsed = JSON.parse(captured.errors[0]);
    assert.equal(parsed.error, 'Something failed');
  });

  it('warn() outputs in human mode', async () => {
    const { setJsonMode, warn } = await importFresh('lib/output.js');
    setJsonMode(false);
    warn('Careful');

    assert.ok(captured.warns.some((l) => l.includes('Careful')));
  });

  it('warn() outputs nothing in JSON mode', async () => {
    const { setJsonMode, warn } = await importFresh('lib/output.js');
    setJsonMode(true);
    warn('Careful');
    setJsonMode(false);

    assert.equal(captured.warns.length, 0);
  });

  it('info() outputs in human mode', async () => {
    const { setJsonMode, info } = await importFresh('lib/output.js');
    setJsonMode(false);
    info('Note');

    assert.ok(captured.logs.some((l) => l.includes('Note')));
  });

  it('info() outputs nothing in JSON mode', async () => {
    const { setJsonMode, info } = await importFresh('lib/output.js');
    setJsonMode(true);
    info('Note');
    setJsonMode(false);

    assert.equal(captured.logs.length, 0);
  });

  it('table() outputs JSON array in JSON mode', async () => {
    const { setJsonMode, table } = await importFresh('lib/output.js');
    setJsonMode(true);
    const rows = [{ id: '1', name: 'Proj' }];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ];
    table(rows, cols);
    setJsonMode(false);

    assert.ok(captured.logs.length > 0);
    const parsed = JSON.parse(captured.logs[0]);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed[0].name, 'Proj');
  });

  it('table() prints formatted columns in human mode', async () => {
    const { setJsonMode, table } = await importFresh('lib/output.js');
    setJsonMode(false);
    const rows = [
      { id: '1', name: 'Project Alpha' },
      { id: '2', name: 'Project Beta' },
    ];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ];
    table(rows, cols);

    // Should have header, separator, and data rows
    assert.ok(captured.logs.length >= 4); // header + separator + 2 rows
    assert.ok(captured.logs.some((l) => l.includes('Project Alpha')));
  });

  it('table() handles empty rows', async () => {
    const { setJsonMode, table } = await importFresh('lib/output.js');
    setJsonMode(false);
    table([], [{ key: 'id', label: 'ID' }]);

    assert.ok(captured.logs.some((l) => l.includes('No results')));
  });

  it('table() truncates long values with ellipsis', async () => {
    const { setJsonMode, table } = await importFresh('lib/output.js');
    setJsonMode(false);
    const longName = 'A'.repeat(50);
    table(
      [{ name: longName }],
      [{ key: 'name', label: 'Name', maxWidth: 10 }]
    );

    assert.ok(captured.logs.some((l) => l.includes('\u2026'))); // ellipsis char
  });
});
