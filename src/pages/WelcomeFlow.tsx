import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FolderPlus,
  Users,
  LayoutTemplate,
  ChevronRight,
  Rocket,
  Book,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboardingState } from '../hooks/useOnboardingState';

/**
 * WelcomeFlow - Comprehensive onboarding experience
 *
 * Flow: Welcome -> Quick Start Options -> Dashboard
 *
 * Features:
 * - Personalized greeting with user's name
 * - Quick actions to get started
 * - Links to help resources
 * - Progress tracking via onboarding state
 */

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  primary?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'create',
    title: 'Create Project',
    description: 'Start fresh with a blank project',
    icon: FolderPlus,
    path: '/get-started',
    primary: true,
  },
  {
    id: 'templates',
    title: 'Use Template',
    description: 'Start with a pre-built template',
    icon: LayoutTemplate,
    path: '/projects?tab=templates',
  },
  {
    id: 'team',
    title: 'Join Team',
    description: 'Accept a team invitation',
    icon: Users,
    path: '/organization?tab=team',
  },
];

const highlights = [
  'Real-time collaboration',
  'AI-powered design tools',
  'Formation & drill writing',
  'Secure file sharing',
];

export function WelcomeFlow() {
  const [step, setStep] = useState<'welcome' | 'start'>('welcome');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { completeWelcome, shouldShowWelcome } = useOnboardingState();

  // Redirect if welcome already completed
  useEffect(() => {
    if (!shouldShowWelcome()) {
      navigate('/projects', { replace: true });
    }
  }, [shouldShowWelcome, navigate]);

  const handleContinue = () => {
    setStep('start');
  };

  const handleSkip = () => {
    completeWelcome();
    navigate('/projects');
  };

  const handleQuickAction = (action: QuickAction) => {
    completeWelcome();
    navigate(action.path);
  };

  const handleViewHelp = () => {
    completeWelcome();
    navigate('/help');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 'welcome' ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Logo & Welcome */}
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20"
                >
                  <Sparkles className="h-10 w-10 text-white" aria-hidden="true" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3"
                >
                  Welcome to FluxStudio
                </motion.h1>
                {user && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-gray-300"
                  >
                    Hey {user.name?.split(' ')[0] || 'there'}!
                  </motion.p>
                )}
              </div>

              {/* Value Props */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/10"
              >
                <p className="text-lg text-gray-300 mb-4">
                  Your creative collaboration hub is ready
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {highlights.map((highlight, index) => (
                    <motion.span
                      key={highlight}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="px-3 py-1.5 bg-white/10 rounded-full text-sm text-gray-300"
                    >
                      {highlight}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={handleContinue}
                className="w-full max-w-sm mx-auto py-4 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg
                         flex items-center justify-center group shadow-lg shadow-purple-500/20"
              >
                Let's Go
                <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </motion.button>

              {/* Skip */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={handleSkip}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip to dashboard
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20"
                >
                  <Rocket className="h-8 w-8 text-white" aria-hidden="true" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  How would you like to start?
                </h2>
                <p className="text-gray-400">
                  Choose an option to get started right away
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleQuickAction(action)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 ${
                        action.primary
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/20'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          action.primary ? 'bg-white/20' : 'bg-white/10'
                        }`}
                      >
                        <ActionIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{action.title}</h3>
                        <p className={action.primary ? 'text-blue-100' : 'text-gray-400'}>
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Help Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <button
                  onClick={handleViewHelp}
                  className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-4 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Book className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white">Need Help?</h3>
                    <p className="text-sm text-gray-400">
                      Check out our getting started guide
                    </p>
                  </div>
                  <HelpCircle className="h-5 w-5 text-gray-500" aria-hidden="true" />
                </button>
              </motion.div>

              {/* Back / Skip */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => setStep('welcome')}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Skip to dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-2 mt-8"
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'welcome' ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'start' ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600'
            }`}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default WelcomeFlow;
