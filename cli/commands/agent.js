import { getClient } from '../lib/client.js';
import { setJsonMode, print, success, table, info } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

export function registerAgentCommands(program) {
  const agent = program
    .command('agent')
    .alias('a')
    .description('Agent API commands');

  agent
    .command('brief <projectId>')
    .description('Get agent brief for a project')
    .action(async (projectId) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/agent/brief/${projectId}`);
        const brief = res.data || res;

        if (globalOpts.json) {
          print(brief);
        } else {
          console.log(`Project: ${brief.project?.name || projectId}`);
          if (brief.description) console.log(`\n${brief.description}`);
          if (brief.goals?.length) {
            console.log('\nGoals:');
            brief.goals.forEach((g) => console.log(`  • ${g}`));
          }
          if (brief.constraints?.length) {
            console.log('\nConstraints:');
            brief.constraints.forEach((c) => console.log(`  • ${c}`));
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('changes <projectId>')
    .description('Get recent changes for a project')
    .option('-l, --limit <n>', 'Max results', '10')
    .action(async (projectId, opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/agent/changes/${projectId}`, {
          query: { limit: opts.limit },
        });
        const changes = res.data || res;

        if (globalOpts.json) {
          print(changes);
        } else {
          const rows = (Array.isArray(changes) ? changes : []).map((c) => ({
            type: c.type || '—',
            description: c.description || c.message || '—',
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
          }));
          table(rows, [
            { key: 'type', label: 'Type', maxWidth: 12 },
            { key: 'description', label: 'Description', maxWidth: 50 },
            { key: 'date', label: 'Date', maxWidth: 12 },
          ]);
        }
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('activity <projectId>')
    .description('Get agent activity for a project')
    .option('-l, --limit <n>', 'Max results', '10')
    .action(async (projectId, opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/agent/activity/${projectId}`, {
          query: { limit: opts.limit },
        });
        const activity = res.data || res;

        if (globalOpts.json) {
          print(activity);
        } else {
          const items = Array.isArray(activity) ? activity : [];
          if (!items.length) {
            info('No recent activity');
            return;
          }
          for (const item of items) {
            const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
            console.log(`  [${date}] ${item.action || item.type || '—'}: ${item.description || item.message || '—'}`);
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('actions <projectId>')
    .description('List pending agent actions')
    .action(async (projectId) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.get(`/api/agent/actions/${projectId}`);
        const actions = res.data || res;

        if (globalOpts.json) {
          print(actions);
        } else {
          const rows = (Array.isArray(actions) ? actions : []).map((a) => ({
            id: a.id,
            type: a.type || '—',
            description: a.description || '—',
            status: a.status || '—',
          }));
          table(rows, [
            { key: 'id', label: 'ID', maxWidth: 36 },
            { key: 'type', label: 'Type', maxWidth: 12 },
            { key: 'description', label: 'Description', maxWidth: 40 },
            { key: 'status', label: 'Status', maxWidth: 10 },
          ]);
        }
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('approve <actionId>')
    .description('Approve a pending agent action')
    .action(async (actionId) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const res = await client.post(`/api/agent/actions/${actionId}/approve`);

        if (globalOpts.json) {
          print(res.data || res);
        } else {
          success(`Action ${actionId} approved`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('reject <actionId>')
    .description('Reject a pending agent action')
    .option('-r, --reason <reason>', 'Rejection reason')
    .action(async (actionId, opts) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        const client = getClient(globalOpts);
        const body = opts.reason ? { reason: opts.reason } : {};
        const res = await client.post(`/api/agent/actions/${actionId}/reject`, body);

        if (globalOpts.json) {
          print(res.data || res);
        } else {
          success(`Action ${actionId} rejected`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
