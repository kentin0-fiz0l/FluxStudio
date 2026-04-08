/**
 * OnboardingV2 - Streamlined 3-step onboarding for <30s time-to-first-creation
 *
 * Now the default signup flow (rollback via `onboarding_v2_disabled` flag).
 *
 * Flow:
 *   Step 1: Quick Auth (target 10s) - email/password or Google sign-in
 *           After auth, role selection sub-step: Band Director vs Design Team
 *   Step 2: Template Selection (target 15s) - role-filtered templates or blank
 *   Step 3: Into the Editor (target 5s) - redirect with AI welcome + coach-mark
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Music,
  Palette,
  Plus,
  Loader2,
  Users,
  Sparkles,
} from 'lucide-react';
import { useAuth, type UserType } from '@/store/slices/authSlice';
import { useGoogleOAuth } from '../hooks/auth/useGoogleOAuth';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { eventTracker } from '../services/analytics/eventTracking';
import { templateRegistry } from '@/services/formationTemplates/registry';
import type { DrillTemplate } from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';
import aiService from '@/services/aiService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

/** Maximum number of featured templates to show in step 2 */
const FEATURED_TEMPLATE_COUNT = 6;

type OnboardingStep = 'auth' | 'role' | 'trial' | 'template' | 'launching';

type UserRole = 'band_director' | 'design_team';

/** Tags that indicate drill/formation templates for band directors */
const BAND_DIRECTOR_TAGS = ['drill', 'marching', 'formation', 'line', 'wedge', 'stagger', 'fan'];

/** Tags that indicate design/layout templates for design teams */
const DESIGN_TEAM_TAGS = ['basic', 'intermediate', 'layout', 'scatter', 'circle', 'custom'];

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
// Role Selection Card
// ---------------------------------------------------------------------------

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 p-5 rounded-xl border text-left transition-all',
        selected
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
          : 'border-white/10 hover:border-white/30 hover:bg-white/5',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
        selected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400',
      )}>
        {icon}
      </div>
      <h3 className={cn(
        'text-sm font-semibold mb-1',
        selected ? 'text-white' : 'text-gray-200',
      )}>
        {title}
      </h3>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OnboardingV2() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || undefined;
  const inviteParam = searchParams.get('invite') || '';

  const [step, setStep] = useState<OnboardingStep>('auth');
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Auth form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteParam);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [betaGateEnabled, setBetaGateEnabled] = useState(false);

  // Role selection state
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // AI welcome message state
  const [aiWelcome, setAiWelcome] = useState('');

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { completeWelcome, completeOnboarding } = useOnboardingState();

  // Track mount
  useEffect(() => {
    eventTracker.trackEvent('onboarding_v2_started', { hasReferral: !!referralCode });
  }, [referralCode]);

  // Sprint 56: Check if beta invite gate is enabled
  useEffect(() => {
    fetch('/api/flags/beta-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.betaInviteRequired) setBetaGateEnabled(true);
      })
      .catch(() => {});
  }, []);

  // If already authenticated and still on auth step, skip to role selection
  useEffect(() => {
    if (isAuthenticated && step === 'auth') {
      goToStep('role');
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Google OAuth
  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true,
  });

  // Featured templates filtered by role
  const featuredTemplates = useMemo<DrillTemplate[]>(() => {
    const all = templateRegistry.getAllTemplates();

    let filtered = all;
    if (userRole === 'band_director') {
      filtered = all.filter(t =>
        t.tags.some(tag => BAND_DIRECTOR_TAGS.includes(tag)) || t.category === 'drill'
      );
    } else if (userRole === 'design_team') {
      filtered = all.filter(t =>
        t.tags.some(tag => DESIGN_TEAM_TAGS.includes(tag)) || t.category === 'basic' || t.category === 'intermediate'
      );
    }

    // If filtering left too few results, fall back to all
    if (filtered.length < FEATURED_TEMPLATE_COUNT) {
      filtered = all;
    }

    // Prefer basic + intermediate templates as they are more accessible for new users
    const sorted = [...filtered].sort((a, b) => {
      const order: Record<string, number> = { basic: 0, intermediate: 1, drill: 2, advanced: 3, custom: 4 };
      return (order[a.category] ?? 5) - (order[b.category] ?? 5);
    });
    return sorted.slice(0, FEATURED_TEMPLATE_COUNT);
  }, [userRole]);

  // ------------------------------------------------------------------
  // Navigation helpers
  // ------------------------------------------------------------------

  const goToStep = useCallback((next: OnboardingStep) => {
    const order: OnboardingStep[] = ['auth', 'role', 'trial', 'template', 'launching'];
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
      await signup(email, password, name || email.split('@')[0], 'client' as UserType, referralCode, inviteCode || undefined);
      eventTracker.trackEvent('onboarding_v2_auth_complete', { method: 'email' });
      goToStep('role');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Step 1b: Role selection
  // ------------------------------------------------------------------

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('onboarding_v2_role', role);
    eventTracker.trackEvent('onboarding_v2_role_selected', { role });

    // Persist role to user profile (non-blocking)
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_type: role }),
      }).catch(() => {});
    }

    goToStep('trial');
  };

  // ------------------------------------------------------------------
  // Step 1c: Start trial (Phase 4)
  // ------------------------------------------------------------------

  const [trialStarting, setTrialStarting] = useState(false);

  const handleStartTrial = async () => {
    setTrialStarting(true);
    try {
      const res = await fetch('/api/payments/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        eventTracker.trackEvent('trial_started', { source: 'onboarding_v2' });
      }
    } catch {
      // Trial activation failed silently — user can still proceed
    }
    setTrialStarting(false);
    goToStep('template');
  };

  const handleSkipTrial = () => {
    eventTracker.trackEvent('trial_skipped', { source: 'onboarding_v2' });
    goToStep('template');
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
      eventTracker.trackEvent('onboarding_v2_completed', { templateId, userRole });

      // Store selected template for the editor to pick up
      if (templateId) {
        localStorage.setItem('onboarding_v2_template', templateId);
      }

      // Fire AI welcome message (non-blocking)
      if (userRole) {
        const roleLabel = userRole === 'band_director' ? 'marching band director' : 'design team member';
        aiService.streamChat(
          `Welcome the user as a new ${roleLabel} on FluxStudio. Give them one helpful tip for getting started. Keep it under 50 words.`,
          {},
          {
            onChunk: (chunk: string) => {
              setAiWelcome(prev => prev + chunk);
            },
            onError: () => {
              // Silently fall back - the static tip remains visible
            },
          },
        ).catch(() => {
          // Silently fall back
        });
      }

      // Short delay so the user sees the launching state, then redirect
      setTimeout(() => {
        navigate('/get-started', {
          state: { fromOnboardingV2: true, templateId, userRole },
        });
      }, 2500);
    },
    [goToStep, completeWelcome, completeOnboarding, navigate, userRole],
  );

  // ------------------------------------------------------------------
  // Progress indicator
  // ------------------------------------------------------------------

  const stepIndex = step === 'auth' ? 0 : step === 'role' ? 0 : step === 'trial' ? 0 : step === 'template' ? 1 : 2;

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
          <span className={cn(stepIndex >= 0 && 'text-blue-400 font-medium')}>Create Account</span>
          <span className={cn(stepIndex >= 1 && 'text-blue-400 font-medium')}>Pick Template</span>
          <span className={cn(stepIndex >= 2 && 'text-blue-400 font-medium')}>Start Creating</span>
        </div>
        <p className="text-xs text-gray-500 text-center mb-2">Step {stepIndex + 1} of 3</p>
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
                <h2 className="text-2xl font-bold mb-1">Start Designing Your Show</h2>
                <p className="text-gray-400 text-sm">Create your free account in seconds</p>
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
                  <label htmlFor="onboarding-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Name
                  </label>
                  <input
                    id="onboarding-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                             placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                             focus:ring-blue-500 transition-colors"
                    placeholder="Your name"
                    autoFocus
                    autoComplete="name"
                  />
                </div>

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

                {betaGateEnabled && (
                  <div>
                    <label htmlFor="onboarding-invite" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Invite Code
                    </label>
                    <input
                      id="onboarding-invite"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                               placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                               focus:ring-blue-500 transition-colors uppercase tracking-wider"
                      placeholder="Enter invite code"
                      maxLength={20}
                    />
                  </div>
                )}

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
          {/* STEP 1b: Role Selection                                           */}
          {/* ---------------------------------------------------------------- */}
          {step === 'role' && (
            <motion.div
              key="role"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">What brings you here?</h2>
                <p className="text-gray-400 text-sm">We'll tailor your experience</p>
              </div>

              <div className="flex gap-3">
                <RoleCard
                  icon={<Music className="h-5 w-5" aria-hidden="true" />}
                  title="Marching Band Director"
                  description="Manage formations, assign sections, share with staff"
                  selected={userRole === 'band_director'}
                  onClick={() => handleRoleSelect('band_director')}
                />
                <RoleCard
                  icon={<Palette className="h-5 w-5" aria-hidden="true" />}
                  title="Design Team"
                  description="Create visual designs, mood boards, brand assets"
                  selected={userRole === 'design_team'}
                  onClick={() => handleRoleSelect('design_team')}
                />
              </div>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 1c: Start Pro Trial (Phase 4)                                */}
          {/* ---------------------------------------------------------------- */}
          {step === 'trial' && (
            <motion.div
              key="trial"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/20">
                  <Sparkles className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Try Pro free for 14 days</h2>
                <p className="text-gray-400 text-sm">No credit card required. Full access to all Pro features.</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  'AI drill writing assistant (200 calls/month)',
                  'Real-time collaboration with up to 5 users',
                  'All export formats (PDF, Dot Book, CSV)',
                  'Audio sync & 3D preview',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={handleStartTrial}
                disabled={trialStarting}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {trialStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Starting trial...
                  </>
                ) : (
                  <>
                    Start 14-day Pro trial
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>

              <p className="mt-4 text-center">
                <button
                  onClick={handleSkipTrial}
                  className="text-xs text-gray-600 hover:text-gray-400 underline underline-offset-2 transition-colors"
                >
                  No thanks, continue with free plan
                </button>
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

              {/* Skip link — goes to blank editor, not empty dashboard */}
              <button
                onClick={() => handleSelectTemplate(null)}
                className="mt-4 w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Skip to editor
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

              {/* AI welcome message or static fallback */}
              {aiWelcome ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-200 text-left"
                >
                  {aiWelcome}
                </motion.div>
              ) : null}

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
      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 capitalize">
        {template.category}
      </span>
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
