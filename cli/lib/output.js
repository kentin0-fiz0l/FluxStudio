import chalk from 'chalk';

let _jsonMode = false;

export function setJsonMode(enabled) {
  _jsonMode = enabled;
}

export function isJsonMode() {
  return _jsonMode;
}

export function print(data) {
  if (_jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

export function success(msg) {
  if (_jsonMode) return;
  console.log(chalk.green('✓') + ' ' + msg);
}

export function error(msg) {
  if (_jsonMode) {
    console.error(JSON.stringify({ error: msg }));
  } else {
    console.error(chalk.red('✗') + ' ' + msg);
  }
}

export function warn(msg) {
  if (_jsonMode) return;
  console.warn(chalk.yellow('⚠') + ' ' + msg);
}

export function info(msg) {
  if (_jsonMode) return;
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

export function table(rows, columns) {
  if (_jsonMode) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (!rows.length) {
    console.log(chalk.dim('  No results'));
    return;
  }

  // Calculate column widths
  const widths = {};
  for (const col of columns) {
    widths[col.key] = col.label.length;
    for (const row of rows) {
      const val = String(row[col.key] ?? '');
      widths[col.key] = Math.min(
        col.maxWidth || 40,
        Math.max(widths[col.key], val.length)
      );
    }
  }

  // Print header
  const header = columns
    .map((col) => col.label.padEnd(widths[col.key]))
    .join('  ');
  console.log(chalk.bold(header));
  console.log(
    columns.map((col) => '─'.repeat(widths[col.key])).join('  ')
  );

  // Print rows
  for (const row of rows) {
    const line = columns
      .map((col) => {
        let val = String(row[col.key] ?? '');
        if (val.length > (col.maxWidth || 40)) {
          val = val.slice(0, (col.maxWidth || 40) - 1) + '…';
        }
        return val.padEnd(widths[col.key]);
      })
      .join('  ');
    console.log(line);
  }
}
