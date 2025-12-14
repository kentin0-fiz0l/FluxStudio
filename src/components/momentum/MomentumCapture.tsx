/**
 * MomentumCapture - Passive context capture component
 *
 * Renders nothing but activates the work momentum capture hook.
 * Place at app level to capture working context as user navigates.
 */

import { useWorkMomentumCapture } from '@/hooks/useWorkMomentumCapture';

export function MomentumCapture() {
  // Activate passive capture
  useWorkMomentumCapture();

  // Renders nothing
  return null;
}

export default MomentumCapture;
