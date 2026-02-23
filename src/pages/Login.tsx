import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SEOHead } from '../components/SEOHead';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://fluxstudio.art';
const GOOGLE_LOGIN_URI = `${API_URL}/api/auth/google/callback`;

const ONBOARDING_KEY = 'welcome_flow_completed';

/** Returns the post-login destination — `/welcome` for first-timers. */
function getPostLoginUrl(callbackUrl: string): string {
  if (callbackUrl !== '/projects') return callbackUrl; // explicit callback takes priority
  const completed = localStorage.getItem(ONBOARDING_KEY);
  if (completed !== 'true') {
    return '/welcome';
  }
  return '/projects';
}

export function Login() {
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const totpInputRef = useRef<HTMLInputElement>(null);
  const { login, loginWithGoogle, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      // Check if 2FA is required
      if (result && 'requires2FA' in result && result.requires2FA) {
        setTempToken(result.tempToken as string);
        setTwoFAStep(true);
        setTimeout(() => totpInputRef.current?.focus(), 100);
        return;
      }
      navigate(getPostLoginUrl(callbackUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      // Store tokens and log in
      if (loginWithToken) {
        await loginWithToken(data);
      } else {
        // Fallback: store manually
        localStorage.setItem('accessToken', data.accessToken || data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        window.location.href = getPostLoginUrl(callbackUrl);
        return;
      }
      navigate(getPostLoginUrl(callbackUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google authentication failed');
      return;
    }
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate(getPostLoginUrl(callbackUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SEOHead
        title="Log In"
        description="Sign in to Flux Studio to access your creative projects, collaborate with your team, and bring your designs to life."
        canonicalUrl="https://fluxstudio.art/login"
      />
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

              {twoFAStep && (
                <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={20} className="text-purple-400" />
                    <h2 className="text-white font-medium">Two-Factor Authentication</h2>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Enter the 6-digit code from your authenticator app, or use a backup code.</p>
                  {error && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleTwoFASubmit} className="space-y-3">
                    <input
                      ref={totpInputRef}
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, ''))}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-center text-lg tracking-widest font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="000000"
                      maxLength={8}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || totpCode.length < 6}
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-lg disabled:opacity-50"
                    >
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTwoFAStep(false); setTotpCode(''); setError(''); }}
                      className="w-full py-2 text-gray-400 hover:text-gray-300 text-sm"
                    >
                      Back to sign in
                    </button>
                  </form>
                </div>
              )}

              {!twoFAStep && error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Google OAuth Button - using redirect mode to bypass COOP */}
              {!twoFAStep && (
              <>
              <div className="mb-4 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="350"
                  useOneTap={false}
                  ux_mode="redirect"
                  login_uri={GOOGLE_LOGIN_URI}
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
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] rounded"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
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
                  to={`/signup${callbackUrl !== '/projects' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                  className="text-pink-400 hover:text-pink-300 transition-colors font-medium"
                >
                  Sign up
                </Link>
              </p>
              </>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-gray-500 text-xs">
            <Link to="/forgot-password" className="text-gray-400 hover:text-gray-300 transition-colors">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
