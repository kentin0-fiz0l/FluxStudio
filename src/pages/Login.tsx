import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

export function Login() {
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
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
      await login(email, password);
      navigate(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Google OAuth button
  useEffect(() => {
    if (googleOAuth.isReady && !googleOAuth.error) {
      googleOAuth.createButton('google-oauth-login', {
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        onSuccess: handleGoogleLogin,
        onError: () => setError('Google sign-in failed'),
      }).catch(() => {
        // Silently fail - Google button won't show
      });
    }
    return () => googleOAuth.removeButton('google-oauth-login');
  }, [googleOAuth.isReady, googleOAuth.error]);

  const handleGoogleLogin = async (response: any) => {
    if (!response.credential) {
      setError('Google authentication failed');
      return;
    }
    try {
      await loginWithGoogle(response.credential);
      navigate(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <span className="text-2xl font-bold text-white">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Flux</span>Studio
        </span>
      </Link>

      {/* Form Card */}
      <div className="w-full max-w-md">
        <div className="bg-[#242424] rounded-2xl shadow-2xl overflow-hidden">
          {/* Accent strip */}
          <div className="h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />

          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-gray-400 mb-6">Sign in to access your creative workspace</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Google OAuth Button */}
            <div className="mb-4">
              {googleOAuth.isLoading && (
                <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Loading...</span>
                </div>
              )}
              <div
                id="google-oauth-login"
                className={googleOAuth.isReady && !googleOAuth.error ? 'flex justify-center' : 'hidden'}
              />
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-[#242424] text-gray-400">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link
                to={`/signup${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="text-pink-400 hover:text-pink-300 transition-colors font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-gray-500 text-xs">
          <Link to="/forgot-password" className="text-gray-400 hover:text-gray-300 transition-colors">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
