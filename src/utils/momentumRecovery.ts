/**
 * Momentum Recovery State Utility
 *
 * Manages the short-lived recovery state that activates when a user
 * clicks a momentum stall notification CTA. This state triggers the
 * MomentumRecoveryPanel to appear in Project Overview.
 *
 * Recovery state expires after:
 * - 24 hours automatically
 * - First meaningful activity (message, step action, asset upload)
 * - Manual dismissal
 */

// ============================================================================
// Configuration
// ============================================================================

/** Hours until recovery state expires automatically */
export const RECOVERY_EXPIRY_HOURS = 24;

// ============================================================================
// LocalStorage Helpers
// ============================================================================

/**
 * Get the localStorage key for recovery state
 */
function getRecoveryKey(projectId: string): string {
  return `fluxstudio_recovery_active_${projectId}`;
}

/**
 * Check if recovery state is currently active for a project
 * Returns true only if the state exists and hasn't expired
 */
export function isRecoveryActive(projectId: string): boolean {
  try {
    const stored = localStorage.getItem(getRecoveryKey(projectId));
    if (!stored) {
      return false;
    }

    // Check if expired
    const activatedAt = new Date(stored);
    if (isNaN(activatedAt.getTime())) {
      // Invalid date, clear it
      clearRecovery(projectId);
      return false;
    }

    const now = new Date();
    const hoursSinceActivation = (now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceActivation > RECOVERY_EXPIRY_HOURS) {
      // Expired, clear it
      clearRecovery(projectId);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Activate recovery state for a project
 * Called when user clicks a momentum stall notification CTA
 */
export function activateRecovery(projectId: string): void {
  try {
    localStorage.setItem(getRecoveryKey(projectId), new Date().toISOString());
  } catch {
    // localStorage not available
  }
}

/**
 * Clear recovery state for a project
 * Called when:
 * - User dismisses the panel manually
 * - User takes a meaningful action (message, step, asset)
 * - Recovery expires
 */
export function clearRecovery(projectId: string): void {
  try {
    localStorage.removeItem(getRecoveryKey(projectId));
  } catch {
    // localStorage not available
  }
}

/**
 * Get the activation timestamp if recovery is active
 * Returns null if not active
 */
export function getRecoveryActivatedAt(projectId: string): Date | null {
  try {
    const stored = localStorage.getItem(getRecoveryKey(projectId));
    if (!stored) {
      return null;
    }

    const activatedAt = new Date(stored);
    if (isNaN(activatedAt.getTime())) {
      return null;
    }

    return activatedAt;
  } catch {
    return null;
  }
}
