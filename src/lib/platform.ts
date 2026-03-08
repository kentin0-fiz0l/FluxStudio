/**
 * Desktop Download Detection Utility
 *
 * Platform detection and desktop download URL helpers for promoting
 * the native FluxStudio desktop app to web users.
 */

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

const GITHUB_RELEASE_BASE =
  'https://github.com/fluxstudio/fluxstudio-desktop/releases/latest/download';

const DOWNLOAD_FILENAMES: Record<Exclude<Platform, 'unknown'>, string> = {
  macos: 'FluxStudio_universal.dmg',
  windows: 'FluxStudio_x64-setup.exe',
  linux: 'FluxStudio_amd64.AppImage',
};

const SUPPORTED_PLATFORMS: Set<Platform> = new Set(['macos', 'windows']);

/** Detect the current platform from the browser user agent. */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('linux')) return 'linux';

  return 'unknown';
}

/** Return the GitHub Release download URL for the given platform. */
export function getDesktopDownloadUrl(platform: Platform): string {
  const filename = DOWNLOAD_FILENAMES[platform as Exclude<Platform, 'unknown'>];
  if (!filename) return '';
  return `${GITHUB_RELEASE_BASE}/${filename}`;
}

/** Whether a desktop release exists for the detected platform. */
export function isDesktopAvailable(): boolean {
  return SUPPORTED_PLATFORMS.has(detectPlatform());
}
