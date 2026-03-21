/**
 * AuthenticationStep - OAuth-first authentication for creator onboarding
 *
 * Displays Google/GitHub OAuth prominently, with email/password fallback.
 * On OAuth success, extracts name from profile and skips name collection.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Eye, EyeOff, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/slices/authSlice';
import { useGoogleOAuth } from '@/hooks/auth/useGoogleOAuth';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

interface AuthUser {
  name: string;
  email: string;
  authMethod: string;
}

interface AuthenticationStepProps {
  onComplete: (user: AuthUser) => void;
}

export function AuthenticationStep({ onComplete }: AuthenticationStepProps) {
  const { signup, loginWithGoogle } = useAuth();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true,
  });

  const handleGoogleSuccess = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setError('Google authentication failed');
        return;
      }
      try {
        setIsLoading(true);
        const user = await loginWithGoogle(response.credential);
        onComplete({
          name: user.name || '',
          email: user.email || '',
          authMethod: 'google',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google authentication failed');
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, onComplete],
  );

  useEffect(() => {
    if (googleOAuth.isReady && !googleOAuth.error) {
      googleOAuth
        .createButton('google-oauth-onboarding', {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          onSuccess: handleGoogleSuccess,
          onError: () => setError('Google sign-in failed'),
        })
        .catch(() => {
          // Silently fail
        });
    }
    return () => googleOAuth.removeButton('google-oauth-onboarding');
  }, [googleOAuth, handleGoogleSuccess]);

  const handleGitHubOAuth = () => {
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!githubClientId) {
      setError('GitHub OAuth is not configured');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback/github`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password, name, 'designer');
      onComplete({ name, email, authMethod: 'email' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Create your account
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Get started in seconds with your preferred sign-in method
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <div id="google-oauth-onboarding" className="flex justify-center min-h-[44px]" />

        <Button
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={handleGitHubOAuth}
          disabled={isLoading}
        >
          <Github className="w-5 h-5" aria-hidden="true" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white dark:bg-neutral-900 text-neutral-400">or</span>
        </div>
      </div>

      {/* Email/Password */}
      {!showEmailForm ? (
        <Button
          variant="ghost"
          className="w-full gap-2 text-neutral-600 dark:text-neutral-400"
          onClick={() => setShowEmailForm(true)}
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Continue with email
        </Button>
      ) : (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleEmailSubmit}
          className="space-y-4"
        >
          <div>
            <label htmlFor="onboard-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Full name
            </label>
            <Input
              id="onboard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="onboard-email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Email
            </label>
            <Input
              id="onboard-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label htmlFor="onboard-password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Input
                id="onboard-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </motion.form>
      )}
    </motion.div>
  );
}
