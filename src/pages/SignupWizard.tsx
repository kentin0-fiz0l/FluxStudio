import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, UserType } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Briefcase,
  CheckCircle,
  Lock,
  Sparkles
} from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '882884563054-813d51d0anok4n1jt3d2j78oiltrhd2f.apps.googleusercontent.com';

interface SignupFormData {
  // Step 1: Basic Info
  name: string;
  email: string;

  // Step 2: Account Security
  password: string;
  confirmPassword: string;

  // Step 3: Profile Setup
  userType: UserType;
  companyName?: string;
  role?: string;
  industry?: string;

  // Step 4: Preferences
  notificationPreferences: string[];
  referralSource?: string;
}

const steps = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Let\'s start with the basics',
    icon: User
  },
  {
    id: 'security',
    title: 'Account Security',
    description: 'Create a secure password',
    icon: Lock
  },
  {
    id: 'profile',
    title: 'Profile Setup',
    description: 'Tell us about yourself',
    icon: Briefcase
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Welcome to FluxStudio',
    icon: CheckCircle
  }
];

export function SignupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'client',
    notificationPreferences: ['email']
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Initialize Google OAuth
  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true,
  });

  const updateFormData = (updates: Partial<SignupFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.name || !formData.email) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!formData.email.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        break;

      case 1: // Security
        if (!formData.password || !formData.confirmPassword) {
          setError('Please fill in all password fields');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        break;

      case 2: // Profile
        if (!formData.userType) {
          setError('Please select your role');
          return false;
        }
        break;
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 2) {
        // Last info step, create account
        handleSubmit();
      } else {
        nextStep();
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signup(formData.email, formData.password, formData.name, formData.userType);
      nextStep(); // Move to success step

      // Redirect after showing success
      setTimeout(() => {
        navigate('/onboarding');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const _handleGoogleSignup = async (response: any) => {
    setError('');
    if (!response.credential) {
      setError('Google authentication failed - no credential received');
      return;
    }

    try {
      await loginWithGoogle(response.credential);
      setCurrentStep(3); // Skip to success
      setTimeout(() => {
        navigate('/onboarding');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const _handleGoogleError = (error?: any) => {
    console.error('Google OAuth Error:', error);
    setError('Google authentication failed - please try again');
  };

  const _progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FluxStudio
            </h1>
          </Link>
          <p className="text-gray-400">Join the creative revolution</p>
        </div>

        {/* Progress Bar */}
        {currentStep < 3 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Step {currentStep + 1} of 3</span>
              <span className="text-sm text-gray-400">{Math.round((currentStep / 3) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Step Indicators */}
        {currentStep < 3 && (
          <div className="flex justify-center space-x-2 mb-8">
            {steps.slice(0, 3).map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <StepIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Basic Info */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Welcome! Let's get started</h2>
                    <p className="text-gray-400">First, tell us a bit about yourself</p>
                  </div>

                  {/* Google Sign Up */}
                  {googleOAuth.isReady && !googleOAuth.error && (
                    <>
                      <div className="google-oauth-wrapper">
                        <div
                          id="google-oauth-signup-wizard-container"
                          className="flex justify-center"
                        />
                      </div>
                      <div className="flex items-center my-6">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="mx-4 text-gray-400 text-sm">or continue with email</span>
                        <div className="flex-grow border-t border-white/10"></div>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormData({ name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData({ email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Security */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Secure Your Account</h2>
                    <p className="text-gray-400">Create a strong password to protect your account</p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateFormData({ password: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="At least 8 characters"
                      />
                      <p className="text-xs text-gray-500 mt-1">Use 8+ characters with a mix of letters, numbers & symbols</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="Re-enter your password"
                      />
                    </div>

                    {/* Password strength indicator */}
                    {formData.password.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs">
                          <div className={`h-1 flex-1 rounded ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={formData.password.length >= 8 ? 'text-green-400' : 'text-red-400'}>
                            {formData.password.length >= 8 ? 'Strong' : 'Weak'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Profile Setup */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Set Up Your Profile</h2>
                    <p className="text-gray-400">Help us personalize your experience</p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        I am a... *
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => updateFormData({ userType: 'client' })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.userType === 'client'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <User className="h-6 w-6 mb-2 text-blue-400" />
                          <h3 className="font-semibold mb-1">Client</h3>
                          <p className="text-sm text-gray-400">Looking for design services</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateFormData({ userType: 'designer' })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.userType === 'designer'
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <Briefcase className="h-6 w-6 mb-2 text-purple-400" />
                          <h3 className="font-semibold mb-1">Designer</h3>
                          <p className="text-sm text-gray-400">Offering design services</p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Company/Organization (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.companyName || ''}
                        onChange={(e) => updateFormData({ companyName: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Your Role (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.role || ''}
                        onChange={(e) => updateFormData({ role: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                                 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                 focus:ring-blue-500 transition-colors"
                        placeholder="e.g., Creative Director, Designer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {currentStep === 3 && (
                <div className="text-center py-8 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                  >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-white" />
                    </div>
                  </motion.div>

                  <h2 className="text-3xl font-bold">Welcome to FluxStudio!</h2>
                  <p className="text-xl text-gray-400">Your account has been created successfully</p>

                  <div className="bg-white/5 rounded-lg p-6 text-left space-y-3">
                    <p className="text-sm text-gray-300">
                      <CheckCircle className="inline h-4 w-4 text-green-400 mr-2" />
                      Account created
                    </p>
                    <p className="text-sm text-gray-300">
                      <CheckCircle className="inline h-4 w-4 text-green-400 mr-2" />
                      Email verification sent
                    </p>
                    <p className="text-sm text-gray-300">
                      <Sparkles className="inline h-4 w-4 text-blue-400 mr-2" />
                      Redirecting to onboarding...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  'Creating Account...'
                ) : currentStep === 2 ? (
                  <>
                    Create Account
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Login Link */}
          {currentStep < 3 && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Terms */}
        {currentStep < 3 && (
          <p className="text-center text-xs text-gray-500 mt-6">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default SignupWizard;
