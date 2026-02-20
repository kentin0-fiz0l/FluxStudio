import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.fluxstudio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  serverUrl: 'http://localhost:3001',
};

function ensureDir() {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

export function getConfig() {
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setConfig(updates) {
  ensureDir();
  const current = getConfig();
  const merged = { ...current, ...updates };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n');
  return merged;
}

export function getServerUrl(cliOverride) {
  if (cliOverride) return cliOverride.replace(/\/+$/, '');
  return getConfig().serverUrl.replace(/\/+$/, '');
}
