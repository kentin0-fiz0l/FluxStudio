/**
 * TryEditor - Sandbox mode for the Formation Editor
 *
 * Allows unauthenticated users to try the formation editor with a sample formation.
 * Pre-populated with 8 performers in a V-formation so users see something
 * meaningful immediately. Save/export are disabled — shows a "Sign up to save" CTA.
 * This is the primary conversion funnel entry point.
 */

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormationCanvas } from '@/components/formation';
import { FormationEditorErrorBoundary } from '@/components/error/ErrorBoundary';
import { FormationPromptBar } from '@/components/formation/FormationPromptBar';
import { SEOHead } from '@/components/SEOHead';
import { ArrowRight, X, Users, Shield, Sparkles } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FEATURE_FLAGS } from '@/constants/featureFlags';
import type { Position } from '@/services/formationService';

const STORAGE_KEY_FORMATIONS = 'tryEditor_formations';

function serializePositions(positions: Map<string, Position>): string {
  return JSON.stringify(Array.from(positions.entries()));
}

function deserializePositions(json: string): Map<string, Position> | null {
  try {
    const entries: [string, Position][] = JSON.parse(json);
    if (!Array.isArray(entries)) return null;
    return new Map(entries);
  } catch {
    return null;
  }
}

function getProgressiveCTA(count: number): string {
  if (count >= 6) return 'Create Your Show Free';
  if (count >= 3) return 'Looking good! Save your work';
  return 'Try it out';
}


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
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  const [showBanner, setShowBanner] = useState(true);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [showAiCTA, setShowAiCTA] = useState(false);
  const [showSandboxLimit, setShowSandboxLimit] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const exitIntentShownRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A/B test: CTA copy variant
  const ctaVariantActive = useFeatureFlag(FEATURE_FLAGS.TRY_CTA_VARIANT);

  // Restore saved positions or fall back to default V-formation
  const initialPositions = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FORMATIONS);
      if (saved) {
        const restored = deserializePositions(saved);
        if (restored && restored.size > 0) return restored;
      }
    } catch { /* fall through to default */ }
    return buildSandboxPositions();
  }, []);

  const [sandboxPositions, setSandboxPositions] = useState<Map<string, Position>>(initialPositions);

  // Debounced auto-save: save positions to localStorage on change
  const saveFormations = useCallback((positions: Map<string, Position>) => {
    setSandboxPositions(positions);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_FORMATIONS, serializePositions(positions));
      } catch { /* storage full or unavailable */ }
    }, 300);
  }, []);

  // Handler for prompt bar applying positions
  const handlePromptApply = useCallback((positions: Map<string, Position>) => {
    saveFormations(positions);
    setShowAiCTA(true);
    eventTracker.trackEvent('sandbox_ai_used', { source: 'prompt_bar' });
  }, [saveFormations]);

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

  // Show "save your work" banner after 3+ interactions
  useEffect(() => {
    if (interactionCount >= 3 && !showSaveBanner) {
      const timer = setTimeout(() => setShowSaveBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [interactionCount, showSaveBanner]);

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
            <Users className="w-4 h-4 flex-shrink-0 text-indigo-200" aria-hidden="true" />
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
                eventTracker.trackEvent('sandbox_signup_click', { source: 'try_banner', interactions: interactionCount, cta_variant: ctaVariantActive });
                navigate('/signup?from=sandbox');
              }}
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              {ctaVariantActive ? 'Create Your Show' : getProgressiveCTA(interactionCount)}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Editor in sandbox mode — pre-populated with V-formation */}
      <div id="sandbox-canvas" className="flex-1 overflow-hidden relative">
        <FormationEditorErrorBoundary>
          <FormationCanvas
            projectId="sandbox"
            sandboxMode={true}
            collaborativeMode={false}
            sandboxPerformers={SANDBOX_PERFORMERS}
            sandboxPositions={sandboxPositions}
            onPositionsChange={saveFormations}
          />
        </FormationEditorErrorBoundary>

        {/* Formation prompt bar — AI-powered formation descriptions */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
          <FormationPromptBar
            performers={SANDBOX_PERFORMERS}
            currentPositions={sandboxPositions}
            selectedPerformerIds={[]}
            onApplyPositions={handlePromptApply}
            initialPrompt={initialPrompt}
          />
        </div>
      </div>

      {/* AI CTA — shown after user generates a formation via prompt bar */}
      {showAiCTA && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-200" aria-hidden="true" />
            <span className="font-medium">Nice formation! Create a free account to save it and get more AI calls.</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                eventTracker.trackEvent('sandbox_signup_click', { source: 'ai_cta', interactions: interactionCount });
                navigate('/signup?from=sandbox');
              }}
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-green-700 rounded-lg font-medium text-sm hover:bg-green-50 transition-colors"
            >
              Create free account
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button onClick={() => setShowAiCTA(false)} className="p-1 text-green-300 hover:text-white">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Sandbox limit upgrade banner */}
      {showSandboxLimit && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-200" aria-hidden="true" />
            <span className="font-medium">You've used your 3 free AI calls today. Sign up free for 200/month.</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                eventTracker.trackEvent('sandbox_signup_click', { source: 'sandbox_limit', interactions: interactionCount });
                navigate('/signup?from=sandbox');
              }}
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-amber-700 rounded-lg font-medium text-sm hover:bg-amber-50 transition-colors"
            >
              Sign up free
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button onClick={() => setShowSandboxLimit(false)} className="p-1 text-amber-200 hover:text-white">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Floating "save your work" banner */}
      {showSaveBanner && !showBanner && interactionCount >= 3 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 shadow-xl rounded-xl px-5 py-3 flex items-center gap-4 border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Save your work — sign up free</span>
          <button
            onClick={() => {
              eventTracker.trackEvent('sandbox_signup_click', { source: 'save_banner', interactions: interactionCount });
              navigate('/signup?from=sandbox');
            }}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign up
          </button>
          <button onClick={() => setShowSaveBanner(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Exit-intent modal (desktop only) */}
      {showExitIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md mx-4 p-6 text-center">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-indigo-500" aria-hidden="true" />
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
                  eventTracker.trackEvent('sandbox_signup_click', { source: 'exit_intent', interactions: interactionCount, cta_variant: ctaVariantActive });
                  navigate('/signup?from=sandbox');
                }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                {ctaVariantActive ? 'Create Your Show' : 'Create free account'}
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
