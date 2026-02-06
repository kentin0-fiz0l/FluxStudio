import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserType } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

export function ModernSignup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'client' as UserType,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(formData.email, formData.password, formData.name, formData.userType);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Create Google OAuth button when ready
  useEffect(() => {
    if (googleOAuth.isReady && !googleOAuth.error) {
      const createGoogleButton = async () => {
        try {
          await googleOAuth.createButton('google-oauth-signup-container', {
            theme: 'filled_black',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            onSuccess: handleGoogleSignup,
            onError: handleGoogleError,
          });
        } catch (err) {
          console.error('Failed to create Google OAuth button:', err);
          const container = document.getElementById('google-oauth-signup-container');
          if (container) container.style.display = 'none';
        }
      };
      createGoogleButton();
    } else if (googleOAuth.error) {
      const container = document.getElementById('google-oauth-signup-container');
      if (container) container.style.display = 'none';
    }

    return () => {
      googleOAuth.removeButton('google-oauth-signup-container');
    };
  }, [googleOAuth.isReady, googleOAuth.error]);

  const handleGoogleSignup = async (response: any) => {
    setError('');
    if (!response.credential) {
      setError('Google authentication failed - no credential received');
      return;
    }

    try {
      await loginWithGoogle(response.credential);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error('Google OAuth Error:', error);
    setError('Google authentication failed - please try again');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FluxStudio
            </h1>
          </Link>
          <p className="mt-2 text-gray-400">Join the creative revolution</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          {/* Google Sign Up */}
          <div className="mb-6">
            <div className="google-oauth-wrapper flex justify-center">
              {googleOAuth.isLoading && (
                <div className="flex items-center justify-center h-12 w-full bg-black/20 rounded-lg border border-white/10 animate-pulse">
                  <span className="text-white/60 text-sm">Loading Google Sign Up...</span>
                </div>
              )}

              <div
                id="google-oauth-signup-container"
                className={`transition-opacity duration-300 ${
                  googleOAuth.isReady && !googleOAuth.error ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  display: googleOAuth.isLoading || googleOAuth.error ? 'none' : 'flex',
                  justifyContent: 'center'
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="mx-4 text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                         placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                         focus:ring-blue-500 transition-colors"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                         placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                         focus:ring-blue-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                         placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1
                         focus:ring-blue-500 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-300 mb-2">
                I am a...
              </label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                         transition-colors"
              >
                <option value="client">Client (looking for design services)</option>
                <option value="designer">Designer (offering design services)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                       text-white font-semibold hover:from-blue-700 hover:to-purple-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       focus:ring-offset-black transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-gray-500">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}