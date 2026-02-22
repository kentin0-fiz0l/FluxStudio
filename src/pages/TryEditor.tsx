/**
 * TryEditor - Sandbox mode for the Formation Editor
 *
 * Allows unauthenticated users to try the formation editor with a sample formation.
 * Pre-populated with 8 performers in a V-formation so users see something
 * meaningful immediately. Save/export are disabled — shows a "Sign up to save" CTA.
 * This is the primary conversion funnel entry point.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormationCanvas } from '@/components/formation';
import { SEOHead } from '@/components/SEOHead';
import { ArrowRight, X } from 'lucide-react';
import type { Position } from '@/services/formationService';

// 8 performers in a V-formation (wedge pointing forward)
// Stage default: 40 wide x 30 tall, grid size 2
const SANDBOX_PERFORMERS = [
  { id: 'sb-1', name: 'Drum Major',  label: 'DM', color: '#ef4444' },
  { id: 'sb-2', name: 'Performer 2', label: 'P2', color: '#f97316' },
  { id: 'sb-3', name: 'Performer 3', label: 'P3', color: '#eab308' },
  { id: 'sb-4', name: 'Performer 4', label: 'P4', color: '#22c55e' },
  { id: 'sb-5', name: 'Performer 5', label: 'P5', color: '#14b8a6' },
  { id: 'sb-6', name: 'Performer 6', label: 'P6', color: '#3b82f6' },
  { id: 'sb-7', name: 'Performer 7', label: 'P7', color: '#8b5cf6' },
  { id: 'sb-8', name: 'Performer 8', label: 'P8', color: '#ec4899' },
];

function buildSandboxPositions(): Map<string, Position> {
  const pos = new Map<string, Position>();
  // V-formation: leader at front-center, spreading back
  pos.set('sb-1', { x: 20, y: 6,  rotation: 0 }); // Point
  pos.set('sb-2', { x: 17, y: 10, rotation: 0 }); // Row 2 left
  pos.set('sb-3', { x: 23, y: 10, rotation: 0 }); // Row 2 right
  pos.set('sb-4', { x: 14, y: 14, rotation: 0 }); // Row 3 left
  pos.set('sb-5', { x: 26, y: 14, rotation: 0 }); // Row 3 right
  pos.set('sb-6', { x: 11, y: 18, rotation: 0 }); // Row 4 left
  pos.set('sb-7', { x: 29, y: 18, rotation: 0 }); // Row 4 right
  pos.set('sb-8', { x: 20, y: 22, rotation: 0 }); // Anchor (back center)
  return pos;
}

export default function TryEditor() {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = React.useState(true);
  const sandboxPositions = useMemo(() => buildSandboxPositions(), []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <SEOHead
        title="Try the Formation Editor"
        description="Design marching band and drill team formations right in your browser. No signup required."
        canonicalUrl="https://fluxstudio.art/try"
      />
      {/* Top banner — sign up CTA */}
      {showBanner && (
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">You're trying FluxStudio</span>
            <span className="text-indigo-200">—</span>
            <span className="text-indigo-100">Sign up free to save your work and collaborate with your team</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              Sign up free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-200 hover:text-white text-sm transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 text-indigo-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor in sandbox mode — pre-populated with V-formation */}
      <div className="flex-1 overflow-hidden">
        <FormationCanvas
          projectId="sandbox"
          sandboxMode={true}
          collaborativeMode={false}
          sandboxPerformers={SANDBOX_PERFORMERS}
          sandboxPositions={sandboxPositions}
        />
      </div>
    </div>
  );
}
