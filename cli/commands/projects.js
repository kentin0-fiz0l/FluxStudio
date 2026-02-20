import { getClient } from '../lib/client.js';
import { setJsonMode, print, success, table } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const PROJECT_COLUMNS = [
  { key: 'id', label: 'ID', maxWidth: 36 },
  { key: 'name', label: 'Name', maxWidth: 30 },
  { key: 'status', label: 'Status', maxWidth: 12 },
  { key: 'updatedAt', label: 'Updated', maxWidth: 20 },
];

export function registerProjectsCommands(program) {
  const projects = program
    .command('projects')
    .alias('p')
    .description('Manage projects');

  projects
    .command('list')
    .description('List projects')
    .option('-l, --limit <n>', 'Max results', '20')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const query = { limit: opts.limit };
        if (opts.status) query.status = opts.status;

        const res = await client.get('/api/projects', { query });
        const projects = res.data || res.projects || res;

        if (globalOpts.json) {
          print(projects);
        } else {
          const rows = (Array.isArray(projects) ? projects : []).map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status || '—',
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—',
          }));
          table(rows, PROJECT_COLUMNS);
        }
      } catch (err) {
        handleError(err);
      }
    });

  projects
    .command('get <id>')
    .description('Get project details')
    .action(async (id) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/projects/${id}`);
        const project = res.data || res;

        if (globalOpts.json) {
          print(project);
        } else {
          console.log(`${project.name}`);
          if (project.description) console.log(`  ${project.description}`);
          console.log(`  ID:      ${project.id}`);
          console.log(`  Status:  ${project.status || '—'}`);
          console.log(`  Created: ${project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}`);
          console.log(`  Updated: ${project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}`);
          if (project.members) console.log(`  Members: ${project.members.length}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  projects
    .command('create')
    .description('Create a new project')
    .requiredOption('-n, --name <name>', 'Project name')
    .option('-d, --description <desc>', 'Project description')
    .action(async (opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const body = { name: opts.name };
        if (opts.description) body.description = opts.description;

        const res = await client.post('/api/projects', body);
        const project = res.data || res;

        if (globalOpts.json) {
          print(project);
        } else {
          success(`Created project: ${project.name} (${project.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  projects
    .command('search <query>')
    .description('Search projects')
    .action(async (query) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get('/api/projects', { query: { search: query } });
        const projects = res.data || res.projects || res;

        if (globalOpts.json) {
          print(projects);
        } else {
          const rows = (Array.isArray(projects) ? projects : []).map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status || '—',
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—',
          }));
          table(rows, PROJECT_COLUMNS);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
