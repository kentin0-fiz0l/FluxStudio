import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, forwardRef } from 'react';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com';

// ForwardRef wrapper for React Router Link to fix Slot ref warnings
const ForwardedLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => (
  <Link {...props} ref={ref} />
));
ForwardedLink.displayName = "ForwardedLink";

/**
 * Ultra-sleek HomepageAuth component with optimized Google OAuth
 */
export function HomepageAuth() {
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Initialize optimized Google OAuth
  const googleOAuth = useGoogleOAuth({
    clientId: GOOGLE_CLIENT_ID,
    preload: true, // Preload for better performance
  });

  // Create Google OAuth button when ready
  useEffect(() => {
    if (googleOAuth.isReady && !googleOAuth.error) {
      const createGoogleButton = async () => {
        try {
          await googleOAuth.createButton('google-oauth-container', {
            theme: 'filled_black',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            onSuccess: handleGoogleLogin,
            onError: handleGoogleError,
          });
        } catch (err) {
          console.error('Failed to create Google OAuth button:', err);
          // Don't show error to user, just hide the Google button
          const container = document.getElementById('google-oauth-container');
          if (container) {
            container.style.display = 'none';
          }
        }
      };

      createGoogleButton();
    } else if (googleOAuth.error) {
      // Hide Google OAuth button on error
      const container = document.getElementById('google-oauth-container');
      if (container) {
        container.style.display = 'none';
      }
    }

    // Cleanup on unmount
    return () => {
      googleOAuth.removeButton('google-oauth-container');
    };
  }, [googleOAuth.isReady, googleOAuth.error]);

  const handleGoogleLogin = async (response: any) => {
    console.log('🚀 Ultra-sleek Google OAuth Success');
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
    console.error('🚫 Ultra-sleek Google OAuth Error:', error);
    setError('Google authentication failed - please try again');
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Prominent Action Buttons */}
      <div className="space-y-3">
        {/* Google Sign Up Button - Ultra-sleek Implementation */}
        <div className="flex justify-center">
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
              id="google-oauth-container"
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

        {/* Traditional Sign Up Button */}
        <Button
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 text-lg rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25"
          asChild
        >
          <ForwardedLink to="/signup">
            Create Free Account
          </ForwardedLink>
        </Button>

        {/* Traditional Sign In Button */}
        <Button
          variant="ghost"
          className="w-full text-white hover:text-pink-400 transition-all duration-200 py-3 text-base border border-white/20 hover:border-pink-400/50 hover:bg-pink-400/5"
          asChild
        >
          <ForwardedLink to="/login">
            Already have an account? Sign In
          </ForwardedLink>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Quick Benefits with Enhanced Styling */}
      <div className="text-center text-white/60 text-sm space-y-2 pt-4">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-pink-400">✨</span>
          <span>Instant access to design concepts</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-blue-400">🎨</span>
          <span>Connect with creative professionals</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-purple-400">🚀</span>
          <span>Bring your vision to life</span>
        </div>
      </div>

      {/* Comprehensive dark mode Google OAuth styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Ultra-sleek Google OAuth container styling */
          .google-oauth-wrapper {
            position: relative;
            z-index: 10;
            isolation: isolate;
          }

          /* Smooth transitions for all interactive elements */
          #google-oauth-container * {
            transition: all 0.2s ease !important;
          }

          /* NUCLEAR: Remove ALL white backgrounds including parent containers */
          #google-oauth-container,
          #google-oauth-container *,
          #google-oauth-container iframe,
          #google-oauth-container div,
          #google-oauth-container div[role="button"],
          #google-oauth-container button,
          #google-oauth-container span,
          #google-oauth-container [class*="gsi"],
          #google-oauth-container [id*="gsi"],
          #google-oauth-container .gsi-material-button,
          #google-oauth-container .gsi-material-button-contents,
          #google-oauth-container .gsi-material-button-state-hover,
          #google-oauth-container .gsi-material-button-state-focused,
          /* Target parent wrapper containers */
          #google-oauth-container > div,
          #google-oauth-container > div > div,
          #google-oauth-container > div > div > div,
          #google-oauth-container div[style*="background"],
          #google-oauth-container div[style*="border"],
          /* Target dark mode specific containers */
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
          }

          /* Target specific Google button states */
          #google-oauth-container button:hover,
          #google-oauth-container button:focus,
          #google-oauth-container button:active,
          #google-oauth-container div[role="button"]:hover,
          #google-oauth-container div[role="button"]:focus,
          #google-oauth-container div[role="button"]:active {
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }

          /* Remove any ::before and ::after pseudo elements with backgrounds */
          #google-oauth-container *::before,
          #google-oauth-container *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            content: none !important;
            display: none !important;
          }

          /* Force transparent on any nested elements */
          #google-oauth-container > * > * {
            background: transparent !important;
            background-color: transparent !important;
          }

          /* Clean styling without borders */
          #google-oauth-container button,
          #google-oauth-container div[role="button"] {
            border: none !important;
            border-radius: 8px !important;
            background: transparent !important;
          }

          /* Ensure text remains visible in dark mode */
          #google-oauth-container * {
            color: white !important;
          }

          /* Override any injected Google styles that force white backgrounds */
          body #google-oauth-container [style*="background"],
          body #google-oauth-container [style*="background-color"],
          html #google-oauth-container [style*="background"],
          html #google-oauth-container [style*="background-color"] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }

          /* Nuclear option: Target all possible Google elements */
          .gsi-material-button,
          .gsi-material-button-contents,
          .gsi-material-button-content-wrapper,
          div[data-idom-class*="gsi"],
          div[jscontroller],
          div[jsaction] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Force override with highest specificity */
          #google-oauth-container div[style] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
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