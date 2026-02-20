#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from '../commands/auth.js';
import { registerProjectsCommands } from '../commands/projects.js';
import { registerAgentCommands } from '../commands/agent.js';
import { registerFilesCommands } from '../commands/files.js';

const program = new Command();

program
  .name('flux')
  .description('FluxStudio CLI - manage projects, agents, and files')
  .version('0.1.0')
  .option('--json', 'Output raw JSON (for scripting)')
  .option('--server <url>', 'Server URL override');

// Top-level aliases for common auth commands
program
  .command('login')
  .description('Log in to FluxStudio')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .action(async (opts) => {
    const { login } = await import('../commands/auth.js');
    await login(opts, program.opts());
  });

program
  .command('logout')
  .description('Log out of FluxStudio')
  .action(async () => {
    const { logout } = await import('../commands/auth.js');
    await logout(program.opts());
  });

program
  .command('whoami')
  .description('Show current user')
  .action(async () => {
    const { whoami } = await import('../commands/auth.js');
    await whoami(program.opts());
  });

// Register command groups
registerAuthCommands(program);
registerProjectsCommands(program);
registerAgentCommands(program);
registerFilesCommands(program);

program.parse();
