import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useState, forwardRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com';

// ForwardRef wrapper for React Router Link to fix Slot ref warnings
const ForwardedLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => (
  <Link {...props} ref={ref} />
));
ForwardedLink.displayName = "ForwardedLink";

/**
 * HomepageAuth component with simplified Google OAuth using @react-oauth/google
 */
export function HomepageAuth() {
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    setError('');

    if (!credentialResponse.credential) {
      setError('Google authentication failed - no credential received');
      return;
    }

    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="w-full max-w-sm mx-auto space-y-4">
        {/* Prominent Action Buttons */}
        <div className="space-y-3">
          {/* Google Sign Up Button - Single instance using @react-oauth/google */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              size="large"
              text="signup_with"
              shape="rectangular"
              width="300"
            />
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
      </div>
    </GoogleOAuthProvider>
  );
}
