/**
 * TryEditor - Sandbox mode for the Formation Editor
 *
 * Allows unauthenticated users to try the formation editor with a sample formation.
 * Pre-populated with 8 performers in a V-formation so users see something
 * meaningful immediately. Save/export are disabled — shows a "Sign up to save" CTA.
 * This is the primary conversion funnel entry point.
 */

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormationCanvas } from '@/components/formation';
import { SEOHead } from '@/components/SEOHead';
import { ArrowRight, X, Users, Shield } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';
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
  const [showBanner, setShowBanner] = useState(true);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const exitIntentShownRef = useRef(false);
  const sandboxPositions = useMemo(() => buildSandboxPositions(), []);

  // Track formation interactions for conversion badge
  const [interactionCount, setInteractionCount] = useState(() => {
    try { return Number(localStorage.getItem('flux_sandbox_interactions') || '0'); } catch { return 0; }
  });

  const trackInteraction = useCallback(() => {
    setInteractionCount(prev => {
      const next = prev + 1;
      try { localStorage.setItem('flux_sandbox_interactions', String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // Increment on any canvas activity (clicks detected via capture)
  useEffect(() => {
    const handler = () => trackInteraction();
    const el = document.getElementById('sandbox-canvas');
    el?.addEventListener('pointerdown', handler, { capture: true });
    return () => el?.removeEventListener('pointerdown', handler, { capture: true });
  }, [trackInteraction]);

  useEffect(() => {
    eventTracker.trackEvent('sandbox_page_view', { page: '/try' });
  }, []);

  // Exit-intent modal: triggers on mouseleave from document (desktop only)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentShownRef.current && interactionCount >= 3) {
        exitIntentShownRef.current = true;
        setShowExitIntent(true);
        eventTracker.trackEvent('sandbox_exit_intent', { interactions: interactionCount });
      }
    };
    document.addEventListener('mouseleave', handler);
    return () => document.removeEventListener('mouseleave', handler);
  }, [interactionCount]);

  // Unsaved work warning on page leave
  useEffect(() => {
    if (interactionCount < 2) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [interactionCount]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <SEOHead
        title="Try the Formation Editor"
        description="Design marching band and drill team formations right in your browser. No signup required."
        canonicalUrl="https://fluxstudio.art/try"
      />
      {/* Top banner — sign up CTA with social proof */}
      {showBanner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 flex-shrink-0 text-indigo-200" />
            <span className="font-medium whitespace-nowrap">
              {interactionCount >= 3
                ? `You've made ${interactionCount} edits — sign up to keep them`
                : 'Join 50+ band directors using FluxStudio'}
            </span>
            <span className="text-indigo-200 hidden sm:inline">—</span>
            <span className="text-indigo-100 hidden sm:inline truncate">Save your work and collaborate with your team</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                eventTracker.trackEvent('sandbox_signup_click', { source: 'try_banner', interactions: interactionCount });
                navigate('/signup');
              }}
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
      <div id="sandbox-canvas" className="flex-1 overflow-hidden">
        <FormationCanvas
          projectId="sandbox"
          sandboxMode={true}
          collaborativeMode={false}
          sandboxPerformers={SANDBOX_PERFORMERS}
          sandboxPositions={sandboxPositions}
        />
      </div>

      {/* Exit-intent modal (desktop only) */}
      {showExitIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md mx-4 p-6 text-center">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Don't lose your work!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              You've made <strong>{interactionCount}</strong> edits to this formation.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
              Create a free account to save your formations and access them from any device.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  eventTracker.trackEvent('sandbox_signup_click', { source: 'exit_intent', interactions: interactionCount });
                  navigate('/signup');
                }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Create free account
              </button>
              <button
                onClick={() => setShowExitIntent(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm transition-colors"
              >
                Continue without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
