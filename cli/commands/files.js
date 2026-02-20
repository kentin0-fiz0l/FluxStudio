import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getClient } from '../lib/client.js';
import { setJsonMode, print, success, table, error } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

export function registerFilesCommands(program) {
  const files = program
    .command('files')
    .alias('f')
    .description('File management commands');

  files
    .command('list <projectId>')
    .description('List files in a project')
    .option('-l, --limit <n>', 'Max results', '20')
    .action(async (projectId, opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/projects/${projectId}/files`, {
          query: { limit: opts.limit },
        });
        const files = res.data || res.files || res;

        if (globalOpts.json) {
          print(files);
        } else {
          const rows = (Array.isArray(files) ? files : []).map((f) => ({
            name: f.name || f.filename || '—',
            type: f.mimeType || f.type || '—',
            size: formatSize(f.size),
            uploaded: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—',
          }));
          table(rows, [
            { key: 'name', label: 'Name', maxWidth: 30 },
            { key: 'type', label: 'Type', maxWidth: 20 },
            { key: 'size', label: 'Size', maxWidth: 10 },
            { key: 'uploaded', label: 'Uploaded', maxWidth: 12 },
          ]);
        }
      } catch (err) {
        handleError(err);
      }
    });

  files
    .command('upload <projectId> <filePath>')
    .description('Upload a file to a project')
    .action(async (projectId, filePath) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      const absPath = resolve(filePath);
      if (!existsSync(absPath)) {
        error(`File not found: ${absPath}`);
        process.exit(1);
      }

      try {
        const ora = (await import('ora')).default;
        const spinner = globalOpts.json ? null : ora('Uploading...').start();

        const client = getClient(globalOpts);
        const res = await client.upload(`/api/projects/${projectId}/files`, absPath);
        const file = res.data || res;

        if (spinner) spinner.stop();

        if (globalOpts.json) {
          print(file);
        } else {
          success(`Uploaded: ${file.name || file.filename || filePath}`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}

function formatSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
