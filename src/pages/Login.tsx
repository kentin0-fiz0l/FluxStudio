import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EnoBackground } from '../components/EnoBackground';
import { Text3D } from '../components/Text3D';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

export function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Initialize new Google OAuth system
  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          await googleOAuth.createButton('google-oauth-login-container', {
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            onSuccess: handleGoogleLogin,
            onError: handleGoogleError,
          });
        } catch (err) {
          console.error('Failed to create Google OAuth button:', err);
          // Don't show error to user, just hide the Google button
          const container = document.getElementById('google-oauth-login-container');
          if (container) {
            container.style.display = 'none';
          }
        }
      };

      createGoogleButton();
    } else if (googleOAuth.error) {
      // Hide Google OAuth button on error
      const container = document.getElementById('google-oauth-login-container');
      if (container) {
        container.style.display = 'none';
      }
    }

    // Cleanup on unmount
    return () => {
      googleOAuth.removeButton('google-oauth-login-container');
    };
  }, [googleOAuth.isReady, googleOAuth.error]);

  const handleGoogleLogin = async (response: any) => {
    console.log('🚀 Google OAuth Success');
    setError('');

    if (!response.credential) {
      setError('Google authentication failed - no credential received');
      return;
    }

    try {
      await loginWithGoogle(response.credential);
      // Wait for next render cycle to ensure user state is set in AuthContext
      setTimeout(() => {
        navigate('/dashboard');
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error('🚫 Google OAuth Error:', error);
    setError('Google authentication failed - please try again');
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center">
      {/* Background */}
      <EnoBackground />

      <div className="relative z-10 w-full max-w-md mx-auto p-8">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-block">
            <Text3D
              text="FLUX STUDIO"
              className="text-4xl md:text-5xl justify-center mb-4"
              color="#ffffff"
              shadowColor="#1a1a1a"
              depth={6}
            />
          </Link>
          <p className="text-gray-400 mt-4">Welcome back to your creative space</p>
        </div>

        {/* Form Container */}
        <div className="backdrop-blur-md bg-white/5 rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         text-white placeholder-gray-500 focus:outline-none focus:border-pink-500
                         focus:ring-1 focus:ring-pink-500 transition-colors"
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
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         text-white placeholder-gray-500 focus:outline-none focus:border-pink-500
                         focus:ring-1 focus:ring-pink-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-600 bg-white/5 text-pink-500 focus:ring-pink-500"
                />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500
                       text-white font-semibold hover:from-pink-600 hover:to-purple-600
                       focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
                       focus:ring-offset-gray-900 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-6 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="mx-4 text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Google Sign-In - New Ultra-sleek Implementation */}
          <div className="mb-6 flex justify-center">
            <div className="google-oauth-wrapper">
              {googleOAuth.isLoading && (
                <div className="flex items-center justify-center h-12 w-64 bg-black/20 rounded-lg border border-white/10 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white/40 rounded-full animate-pulse"></div>
                    <span className="text-white/60 text-sm">Loading Google Sign In...</span>
                  </div>
                </div>
              )}

              {googleOAuth.error && (
                <div className="flex items-center justify-center h-12 w-64 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-red-400 text-sm">Sign in temporarily unavailable</span>
                </div>
              )}

              <div
                id="google-oauth-login-container"
                className={`transition-opacity duration-300 ${
                  googleOAuth.isReady && !googleOAuth.error ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  minHeight: googleOAuth.isLoading ? '0' : '48px',
                  display: googleOAuth.isLoading || googleOAuth.error ? 'none' : 'block'
                }}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-pink-400 hover:text-pink-300 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Ultra-sleek Google OAuth dark mode styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Ultra-sleek Google OAuth container styling */
          .google-oauth-wrapper {
            position: relative;
            z-index: 10;
            isolation: isolate;
          }

          /* IFRAME SPECIFIC: Target the exact Google OAuth iframe */
          iframe[src*="accounts.google.com/gsi/button"],
          iframe.L5Fo6c-PQbLGe,
          iframe[id*="gsi_"],
          iframe[title*="Sign in with Google"] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            outline: none !important;
          }

          /* NUCLEAR: Remove ALL white backgrounds including parent containers */
          #google-oauth-login-container,
          #google-oauth-login-container *,
          #google-oauth-login-container iframe,
          #google-oauth-login-container div,
          #google-oauth-login-container div[role="button"],
          #google-oauth-login-container button,
          #google-oauth-login-container span,
          #google-oauth-login-container [class*="gsi"],
          #google-oauth-login-container [id*="gsi"],
          #google-oauth-login-container > div,
          #google-oauth-login-container > div > div,
          #google-oauth-login-container > div > div > div,
          .google-oauth-wrapper,
          .google-oauth-wrapper *,
          .google-oauth-wrapper > div,
          .google-oauth-wrapper div {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            backdrop-filter: none !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            margin: 0 !important;
          }

          /* Global nuclear option for any Google containers in dark mode */
          body div[jscontroller],
          body div[jsaction],
          body div[data-idom-class],
          body .gsi-material-button,
          body .gsi-material-button-contents,
          body iframe[src*="accounts.google.com"],
          body iframe[src*="gsi"] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }

          /* Target dark mode specific Google wrapper divs */
          body div[style*="background-color: rgb(255, 255, 255)"],
          body div[style*="background-color: white"],
          body div[style*="background: white"],
          body div[style*="background: #fff"],
          body div[style*="background-color: #fff"] {
            background: transparent !important;
            background-color: transparent !important;
          }
        `
      }} />
    </div>
  );
}