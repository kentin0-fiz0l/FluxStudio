import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getClient } from '../lib/client.js';
import { saveCredentials, clearCredentials, getCredentials } from '../lib/auth.js';
import { setJsonMode, print, success, info } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

export async function login(opts, globalOpts) {
  setJsonMode(globalOpts.json);

  try {
    let { email, password } = opts;

    // Interactive prompts if not provided
    if (!email || !password) {
      const rl = createInterface({ input: stdin, output: stdout });
      if (!email) email = await rl.question('Email: ');
      if (!password) password = await rl.question('Password: ');
      rl.close();
    }

    const client = getClient(globalOpts);
    const res = await client.post('/api/auth/login', { email, password }, { auth: false });
    const data = res.data || res;

    saveCredentials({
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt || Date.now() + 3600_000,
      user: data.user || { email },
    });

    if (globalOpts.json) {
      print({ success: true, user: data.user || { email } });
    } else {
      success(`Logged in as ${data.user?.name || data.user?.email || email}`);
    }
  } catch (err) {
    handleError(err);
  }
}

export async function logout(globalOpts) {
  setJsonMode(globalOpts.json);

  try {
    const creds = getCredentials();
    if (creds?.accessToken) {
      const client = getClient(globalOpts);
      try {
        await client.post('/api/auth/logout', {});
      } catch {
        // Server logout failed, clear local anyway
      }
    }

    clearCredentials();

    if (globalOpts.json) {
      print({ success: true });
    } else {
      success('Logged out');
    }
  } catch (err) {
    handleError(err);
  }
}

export async function whoami(globalOpts) {
  setJsonMode(globalOpts.json);

  try {
    const client = getClient(globalOpts);
    const res = await client.get('/api/auth/me');
    const user = res.data || res.user || res;

    if (globalOpts.json) {
      print(user);
    } else {
      console.log(`${user.name || user.email}`);
      if (user.name && user.email) info(user.email);
      if (user.role) info(`Role: ${user.role}`);
    }
  } catch (err) {
    handleError(err);
  }
}

export async function status(globalOpts) {
  setJsonMode(globalOpts.json);

  const creds = getCredentials();

  if (!creds?.accessToken) {
    if (globalOpts.json) {
      print({ loggedIn: false });
    } else {
      info('Not logged in. Run: flux login');
    }
    return;
  }

  const expired = creds.expiresAt && Date.now() >= creds.expiresAt;

  if (globalOpts.json) {
    print({
      loggedIn: true,
      user: creds.user || null,
      expired,
      expiresAt: creds.expiresAt || null,
    });
  } else {
    success(`Logged in as ${creds.user?.name || creds.user?.email || 'unknown'}`);
    if (expired) {
      info('Token expired — will auto-refresh on next request');
    }
  }
}

export function registerAuthCommands(program) {
  const auth = program
    .command('auth')
    .description('Authentication commands');

  auth
    .command('login')
    .description('Log in to FluxStudio')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(async (opts) => {
      await login(opts, program.opts());
    });

  auth
    .command('logout')
    .description('Log out of FluxStudio')
    .action(async () => {
      await logout(program.opts());
    });

  auth
    .command('whoami')
    .description('Show current user')
    .action(async () => {
      await whoami(program.opts());
    });

  auth
    .command('status')
    .description('Show authentication status')
    .action(async () => {
      await status(program.opts());
    });
}
