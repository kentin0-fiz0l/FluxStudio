import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Users,
  Rocket,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  cta: string;
}

const welcomeSteps: WelcomeStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FluxStudio!',
    description: 'Your creative collaboration hub is ready. Let\'s get you started with a quick tour.',
    icon: Sparkles,
    features: [
      'Real-time collaboration with your team',
      'Powerful project management tools',
      'Secure file sharing and version control',
      'Integrated communication features'
    ],
    cta: 'Start Tour'
  },
  {
    id: 'dashboard',
    title: 'Your Adaptive Dashboard',
    description: 'Your dashboard adapts to your role and shows exactly what you need.',
    icon: Zap,
    features: [
      'Personalized widget layout',
      'Quick actions for common tasks',
      'Real-time activity feed',
      'AI-powered smart suggestions'
    ],
    cta: 'Next'
  },
  {
    id: 'collaboration',
    title: 'Collaborate Seamlessly',
    description: 'Work together with your team in real-time, no matter where you are.',
    icon: Users,
    features: [
      'Live document editing',
      'Instant messaging and video calls',
      'Share feedback and annotations',
      'Track project progress together'
    ],
    cta: 'Next'
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'Start creating amazing work with your team today.',
    icon: Rocket,
    features: [
      'Invite team members',
      'Create your first project',
      'Explore templates and resources',
      'Access help and support anytime'
    ],
    cta: 'Go to Dashboard'
  }
];

export function WelcomeFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    const currentStepId = welcomeSteps[currentStep].id;
    setCompletedSteps(prev => [...prev, currentStepId]);

    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark welcome flow as completed
      localStorage.setItem('welcome_flow_completed', 'true');
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('welcome_flow_completed', 'true');
    navigate('/dashboard');
  };

  const step = welcomeSteps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / welcomeSteps.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            FluxStudio
          </h1>
          {user && (
            <p className="text-gray-400">
              Welcome, {user.name}! 👋
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              {currentStep + 1} of {welcomeSteps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip Tour
            </button>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <StepIcon className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">{step.title}</h2>
              <p className="text-xl text-gray-400">{step.description}</p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8">
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">{feature}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleNext}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                       hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg
                       flex items-center justify-center group"
            >
              {step.cta}
              <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Step Indicators */}
        <div className="flex justify-center space-x-2 mt-8">
          {welcomeSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600'
                  : index < currentStep
                  ? 'w-2 bg-green-400'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
