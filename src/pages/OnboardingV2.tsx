/**
 * OnboardingV2 - Streamlined 3-step onboarding for <30s time-to-first-creation
 *
 * Gated behind `onboarding_v2` feature flag.
 *
 * Flow:
 *   Step 1: Quick Auth (target 10s) - email/password or Google sign-in
 *   Step 2: Template Selection (target 15s) - pick a formation template or blank
 *   Step 3: Into the Editor (target 5s) - redirect with coach-mark tooltip
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Plus,
  Loader2,
  Users,
  Sparkles,
} from 'lucide-react';
import { useAuth, type UserType } from '@/store/slices/authSlice';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { eventTracker } from '../services/analytics/eventTracking';
import { templateRegistry } from '@/services/formationTemplates/registry';
import type { DrillTemplate } from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

/** Maximum number of featured templates to show in step 2 */
const FEATURED_TEMPLATE_COUNT = 6;

type OnboardingStep = 'auth' | 'template' | 'launching';

// ---------------------------------------------------------------------------
// Step transition animation variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OnboardingV2() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || undefined;

  const [step, setStep] = useState<OnboardingStep>('auth');
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { completeWelcome, completeOnboarding } = useOnboardingState();

  // Track mount
  useEffect(() => {
    eventTracker.trackEvent('onboarding_v2_started', { hasReferral: !!referralCode });
  }, [referralCode]);

  // If already authenticated, skip to template step
  useEffect(() => {
    if (isAuthenticated && step === 'auth') {
      goToStep('template');
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Google OAuth
  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true,
  });

  // Featured templates (loaded once)
  const featuredTemplates = useMemo<DrillTemplate[]>(() => {
    const all = templateRegistry.getAllTemplates();
    // Prefer basic + intermediate templates as they are more accessible for new users
    const sorted = [...all].sort((a, b) => {
      const order: Record<string, number> = { basic: 0, intermediate: 1, drill: 2, advanced: 3, custom: 4 };
      return (order[a.category] ?? 5) - (order[b.category] ?? 5);
    });
    return sorted.slice(0, FEATURED_TEMPLATE_COUNT);
  }, []);

  // ------------------------------------------------------------------
  // Navigation helpers
  // ------------------------------------------------------------------

  const goToStep = useCallback((next: OnboardingStep) => {
    const order: OnboardingStep[] = ['auth', 'template', 'launching'];
    const currentIdx = order.indexOf(step);
    const nextIdx = order.indexOf(next);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    setStep(next);
  }, [step]);

  // ------------------------------------------------------------------
  // Step 1: Quick Auth submit
  // ------------------------------------------------------------------

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, password, email.split('@')[0], 'client' as UserType, referralCode);
      eventTracker.trackEvent('onboarding_v2_auth_complete', { method: 'email' });
      goToStep('template');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Step 2: Template selection -> Step 3
  // ------------------------------------------------------------------

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    eventTracker.trackEvent('onboarding_v2_template_selected', {
      templateId: templateId ?? 'blank',
    });
    launchEditor(templateId);
  };

  // ------------------------------------------------------------------
  // Step 3: Launch into editor
  // ------------------------------------------------------------------

  const launchEditor = useCallback(
    (templateId: string | null) => {
      goToStep('launching');

      // Mark onboarding complete
      completeWelcome();
      completeOnboarding();

      // Store selected template for the editor to pick up
      if (templateId) {
        sessionStorage.setItem('onboarding_v2_template', templateId);
      }

      // Short delay so the user sees the launching state, then redirect
      setTimeout(() => {
        // Navigate to the formation editor.
        // The get-started flow creates a default project; we route to /get-started
        // which creates the project and redirects to its formation editor.
        navigate('/get-started', {
          state: { fromOnboardingV2: true, templateId },
        });
      }, 1200);
    },
    [goToStep, completeWelcome, completeOnboarding, navigate],
  );

  // ------------------------------------------------------------------
  // Progress indicator
  // ------------------------------------------------------------------

  const stepIndex = step === 'auth' ? 0 : step === 'template' ? 1 : 2;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <Link to="/" className="inline-block">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            FluxStudio
          </h1>
        </Link>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className={cn(stepIndex >= 0 && 'text-blue-400 font-medium')}>Sign Up</span>
          <span className={cn(stepIndex >= 1 && 'text-blue-400 font-medium')}>Pick Template</span>
          <span className={cn(stepIndex >= 2 && 'text-blue-400 font-medium')}>Create</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ---------------------------------------------------------------- */}
          {/* STEP 1: Quick Auth                                                */}
          {/* ---------------------------------------------------------------- */}
          {step === 'auth' && (
            <motion.div
              key="auth"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">Create your account</h2>
                <p className="text-gray-400 text-sm">Start creating in under 30 seconds</p>
              </div>

              {/* Google OAuth */}
              {googleOAuth.isReady && !googleOAuth.error && (
                <>
                  <div className="google-oauth-wrapper">
                    <div
                      id="google-oauth-onboarding-v2-container"
                      className="flex justify-center"
                    />
                  </div>
                  <div className="flex items-center my-5">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="mx-4 text-gray-500 text-xs">or use email</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Email / Password form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label htmlFor="onboarding-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="onboarding-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                             placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                             focus:ring-blue-500 transition-colors"
                    placeholder="you@example.com"
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 text-white
                               placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                               focus:ring-blue-500 transition-colors"
                      placeholder="8+ characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                           hover:from-blue-700 hover:to-purple-700 transition-all font-semibold
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>

              <p className="mt-3 text-center text-[10px] text-gray-600">
                By signing up you agree to our{' '}
                <Link to="/terms" className="underline hover:text-gray-400">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="underline hover:text-gray-400">Privacy Policy</Link>
              </p>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 2: Template Selection                                        */}
          {/* ---------------------------------------------------------------- */}
          {step === 'template' && (
            <motion.div
              key="template"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">Choose a starting point</h2>
                <p className="text-gray-400 text-sm">Pick a formation template or start blank</p>
              </div>

              {/* Template grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {featuredTemplates.map((template) => (
                  <TemplatePreviewCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelectTemplate(template.id)}
                  />
                ))}
              </div>

              {/* Start blank */}
              <button
                onClick={() => handleSelectTemplate(null)}
                className="w-full py-3 rounded-lg border border-dashed border-white/20 hover:border-white/40
                         text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Start blank
              </button>

              {/* Skip link */}
              <button
                onClick={() => {
                  completeWelcome();
                  completeOnboarding();
                  navigate('/projects');
                }}
                className="mt-4 w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Skip to dashboard
              </button>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 3: Launching into editor                                     */}
          {/* ---------------------------------------------------------------- */}
          {step === 'launching' && (
            <motion.div
              key="launching"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20"
              >
                <Sparkles className="h-8 w-8 text-white" aria-hidden="true" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Launching your editor</h2>
              <p className="text-gray-400 text-sm mb-6">
                {selectedTemplateId ? 'Loading your template...' : 'Setting up a blank canvas...'}
              </p>

              {/* Coach-mark preview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Tip: Drag performers to create your formation
              </motion.div>

              <div className="mt-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500 mx-auto" aria-hidden="true" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Preview Card (inline, lightweight)
// ---------------------------------------------------------------------------

interface TemplatePreviewCardProps {
  template: DrillTemplate;
  onSelect: () => void;
}

function TemplatePreviewCard({ template, onSelect }: TemplatePreviewCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group text-left p-3 rounded-xl border border-white/10',
        'hover:border-blue-500/50 hover:bg-white/5 transition-all',
      )}
    >
      {/* Mini preview - colored dots representing performer positions */}
      <div className="aspect-video bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg mb-2 relative overflow-hidden flex items-center justify-center">
        <TemplateDotsPreview template={template} />
      </div>
      <h3 className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
        {template.name}
      </h3>
      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
        <Users className="h-3 w-3" aria-hidden="true" />
        {template.parameters.minPerformers}
        {template.parameters.maxPerformers ? `\u2013${template.parameters.maxPerformers}` : '+'}{' '}
        performers
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Lightweight dot-based template preview (no canvas, pure DOM)
// ---------------------------------------------------------------------------

function TemplateDotsPreview({ template }: { template: DrillTemplate }) {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981',
  ];

  return (
    <>
      {template.performers.slice(0, 12).map((performer, i) => (
        <motion.div
          key={performer.index}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${performer.relativePosition.x}%`,
            top: `${performer.relativePosition.y}%`,
            backgroundColor: colors[i % colors.length],
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </>
  );
}

export default OnboardingV2;
