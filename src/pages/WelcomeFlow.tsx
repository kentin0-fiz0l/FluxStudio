import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FolderPlus,
  Users,
  LayoutTemplate,
  ChevronRight,
  Rocket
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Simplified WelcomeFlow - 2 steps for <30 second time-to-creation
 * Step 1: Welcome with key value props
 * Step 2: Quick start options (Create Project, Use Template, Join Team)
 */

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  primary?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'create',
    title: 'Create Project',
    description: 'Start fresh with a blank project',
    icon: FolderPlus,
    path: '/projects?action=create',
    primary: true
  },
  {
    id: 'templates',
    title: 'Use Template',
    description: 'Start with a pre-built template',
    icon: LayoutTemplate,
    path: '/projects?tab=templates'
  },
  {
    id: 'team',
    title: 'Join Team',
    description: 'Accept a team invitation',
    icon: Users,
    path: '/team'
  }
];

const highlights = [
  'Real-time collaboration',
  'AI-powered design tools',
  'Formation & drill writing',
  'Secure file sharing'
];

export function WelcomeFlow() {
  const [step, setStep] = useState<'welcome' | 'start'>(
    'welcome'
  );
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleContinue = () => {
    setStep('start');
  };

  const handleSkip = () => {
    localStorage.setItem('welcome_flow_completed', 'true');
    navigate('/projects');
  };

  const handleQuickAction = (action: QuickAction) => {
    localStorage.setItem('welcome_flow_completed', 'true');
    navigate(action.path);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
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
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
                  Welcome to FluxStudio
                </h1>
                {user && (
                  <p className="text-xl text-gray-300">
                    Hey {user.name?.split(' ')[0] || 'there'}! 👋
                  </p>
                )}
              </div>

              {/* Value Props */}
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/10">
                <p className="text-lg text-gray-300 mb-4">
                  Your creative collaboration hub is ready
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="px-3 py-1.5 bg-white/10 rounded-full text-sm text-gray-300"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleContinue}
                className="w-full max-w-sm mx-auto py-4 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg
                         flex items-center justify-center group"
              >
                Let's Go
                <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Skip */}
              <button
                onClick={handleSkip}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip to dashboard
              </button>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  How would you like to start?
                </h2>
                <p className="text-gray-400">
                  Choose an option to get started right away
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 ${
                        action.primary
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        action.primary ? 'bg-white/20' : 'bg-white/10'
                      }`}>
                        <ActionIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{action.title}</h3>
                        <p className={action.primary ? 'text-blue-100' : 'text-gray-400'}>
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Back / Skip */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => setStep('welcome')}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Back
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
        <div className="flex justify-center gap-2 mt-8">
          <div className={`h-1.5 rounded-full transition-all ${
            step === 'welcome' ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600'
          }`} />
          <div className={`h-1.5 rounded-full transition-all ${
            step === 'start' ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600'
          }`} />
        </div>
      </div>
    </div>
  );
}

export default WelcomeFlow;
