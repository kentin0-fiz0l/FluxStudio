/**
 * Username Generator Utility
 * Generates unique, memorable usernames for MetMap users
 */

// Musical adjectives for username prefix
const musicalAdjectives = [
  'Acoustic', 'Melodic', 'Rhythmic', 'Harmonic', 'Sonic',
  'Tempo', 'Synth', 'Beat', 'Chord', 'Bass',
  'Treble', 'Sharp', 'Flat', 'Major', 'Minor',
  'Jazz', 'Blues', 'Rock', 'Funk', 'Soul',
  'Groove', 'Swing', 'Flow', 'Vibe', 'Pulse',
  'Echo', 'Loop', 'Drop', 'Rise', 'Fade'
];

// Musical nouns for username suffix
const musicalNouns = [
  'Player', 'Artist', 'Maker', 'Musician', 'Composer',
  'Producer', 'Drummer', 'Bassist', 'Guitarist', 'Keyboardist',
  'Singer', 'Mixer', 'Creator', 'Performer', 'Maestro',
  'Virtuoso', 'Prodigy', 'Master', 'Seeker', 'Explorer',
  'Pioneer', 'Wizard', 'Ninja', 'Hero', 'Legend'
];

/**
 * Generates a random musical username
 * Format: [Adjective][Noun][Number] e.g., "MelodicDrummer42"
 */
export function generateMusicalUsername(): string {
  const adjective = musicalAdjectives[Math.floor(Math.random() * musicalAdjectives.length)];
  const noun = musicalNouns[Math.floor(Math.random() * musicalNouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}${noun}${number}`;
}

/**
 * Generates a short unique ID
 * Format: user_[alphanumeric] e.g., "user_x7k9m2"
 */
export function generateUniqueId(prefix: string = 'user'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${id}`;
}

/**
 * Generates a display name from email
 * Extracts the part before @ and capitalizes first letter
 */
export function generateNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  // Remove numbers and special characters, capitalize words
  const cleaned = localPart
    .replace(/[0-9._-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return cleaned || generateMusicalUsername();
}

/**
 * Ensures a username is unique by appending numbers if needed
 * Takes a check function to verify uniqueness
 */
export async function ensureUniqueUsername(
  baseName: string,
  checkExists: (name: string) => Promise<boolean>
): Promise<string> {
  let candidate = baseName;
  let counter = 1;

  while (await checkExists(candidate)) {
    candidate = `${baseName}${counter}`;
    counter++;

    // Safety limit to prevent infinite loop
    if (counter > 9999) {
      candidate = `${baseName}_${generateUniqueId('')}`;
      break;
    }
  }

  return candidate;
}
