import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.fluxstudio');
const CREDS_FILE = join(CONFIG_DIR, 'credentials.json');

function ensureDir() {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

export function getCredentials() {
  try {
    const raw = readFileSync(CREDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCredentials(creds) {
  ensureDir();
  writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
}

export function clearCredentials() {
  try {
    unlinkSync(CREDS_FILE);
  } catch {
    // Already gone
  }
}

export function isLoggedIn() {
  const creds = getCredentials();
  return creds && creds.accessToken;
}

export function getAccessToken() {
  const creds = getCredentials();
  return creds?.accessToken ?? null;
}

export function getRefreshToken() {
  const creds = getCredentials();
  return creds?.refreshToken ?? null;
}

export function isTokenExpiringSoon() {
  const creds = getCredentials();
  if (!creds?.expiresAt) return true;
  // Refresh if less than 60 seconds remaining
  return Date.now() >= creds.expiresAt - 60_000;
}
