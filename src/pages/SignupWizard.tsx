import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, type UserType } from '@/store/slices/authSlice';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';
import { eventTracker } from '../services/analytics/eventTracking';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Briefcase,
  CheckCircle,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

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
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || undefined;
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
  const [showPassword, setShowPassword] = useState(false);

  // Sprint 44: Track signup_started on mount
  useState(() => {
    eventTracker.trackEvent('signup_started', { hasReferral: !!referralCode });
  });
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    return {
      checks,
      score: passed,
      label: passed <= 1 ? 'Weak' : passed <= 3 ? 'Fair' : passed === 4 ? 'Good' : 'Strong',
      color: passed <= 1 ? 'bg-red-500' : passed <= 3 ? 'bg-yellow-500' : passed === 4 ? 'bg-blue-500' : 'bg-green-500',
      textColor: passed <= 1 ? 'text-red-400' : passed <= 3 ? 'text-yellow-400' : passed === 4 ? 'text-blue-400' : 'text-green-400',
    };
  }, [formData.password]);

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
      eventTracker.trackEvent('signup_step', { step: currentStep + 1, stepId: steps[currentStep + 1]?.id });
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
      await signup(formData.email, formData.password, formData.name, formData.userType, referralCode);
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
                  <StepIcon className="h-4 w-4 mr-2" aria-hidden="true" />
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
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => updateFormData({ password: e.target.value })}
                          className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 text-white
                                   placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                   focus:ring-blue-500 transition-colors"
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                        </button>
                      </div>
                      {/* Password strength indicator */}
                      {formData.password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${passwordStrength.textColor}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-400' : 'text-gray-500'}`}>
                              {passwordStrength.checks.length ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                              8+ characters
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-400' : 'text-gray-500'}`}>
                              {passwordStrength.checks.uppercase ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                              Uppercase
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-400' : 'text-gray-500'}`}>
                              {passwordStrength.checks.lowercase ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                              Lowercase
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-400' : 'text-gray-500'}`}>
                              {passwordStrength.checks.number ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                              Number
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
                          className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border text-white
                                   placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                                   focus:ring-blue-500 transition-colors ${
                                     formData.confirmPassword && formData.password !== formData.confirmPassword
                                       ? 'border-red-500/50'
                                       : formData.confirmPassword && formData.password === formData.confirmPassword
                                       ? 'border-green-500/50'
                                       : 'border-white/10'
                                   }`}
                          placeholder="Re-enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <X size={12} aria-hidden="true" />
                          Passwords do not match
                        </p>
                      )}
                      {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                        <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                          <Check size={12} aria-hidden="true" />
                          Passwords match
                        </p>
                      )}
                    </div>
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
                          <User className="h-6 w-6 mb-2 text-blue-400" aria-hidden="true" />
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
                          <Briefcase className="h-6 w-6 mb-2 text-purple-400" aria-hidden="true" />
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
                      <CheckCircle className="h-12 w-12 text-white" aria-hidden="true" />
                    </div>
                  </motion.div>

                  <h2 className="text-3xl font-bold">Welcome to FluxStudio!</h2>
                  <p className="text-xl text-gray-400">Your account has been created successfully</p>

                  <div className="bg-white/5 rounded-lg p-6 text-left space-y-3">
                    <p className="text-sm text-gray-300">
                      <CheckCircle className="inline h-4 w-4 text-green-400 mr-2" aria-hidden="true" />
                      Account created
                    </p>
                    <p className="text-sm text-gray-300">
                      <CheckCircle className="inline h-4 w-4 text-green-400 mr-2" aria-hidden="true" />
                      Email verification sent
                    </p>
                    <p className="text-sm text-gray-300">
                      <Sparkles className="inline h-4 w-4 text-blue-400 mr-2" aria-hidden="true" />
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
                <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
                    <CheckCircle className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
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
