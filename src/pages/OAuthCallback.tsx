import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface OAuthCallbackProps {
  provider: 'google' | 'figma' | 'slack' | 'github';
}

type CallbackState = 'loading' | 'success' | 'error';

interface CallbackResult {
  success: boolean;
  message?: string;
  data?: {
    provider: string;
    permissions: string[];
    accountName?: string;
  };
}

/**
 * OAuth Callback Page
 *
 * Handles OAuth provider redirects for both popup and full-page flows.
 *
 * Flow:
 * 1. Extract authorization code and state from URL parameters
 * 2. Exchange code for tokens via backend API
 * 3. If opened in popup: message parent window and close
 * 4. If opened in same window: redirect to Settings page
 */
export default function OAuthCallback({ provider }: OAuthCallbackProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [result, setResult] = useState<CallbackResult | null>(null);
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    // Detect if opened in popup vs. full window
    const popup = window.opener !== null && window.opener !== window;
    setIsPopup(popup);

    const handleCallback = async () => {
      try {
        // Extract OAuth parameters from URL
        const code = searchParams.get('code');
        const stateToken = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors (user denied, etc.)
        if (error) {
          const errorMessage = errorDescription || `OAuth error: ${error}`;
          setState('error');
          setResult({
            success: false,
            message: errorMessage
          });

          // Message parent window if popup
          if (popup) {
            window.opener?.postMessage(
              {
                type: 'oauth-callback',
                provider,
                success: false,
                error: errorMessage
              },
              window.location.origin
            );

            // Close popup after brief delay
            setTimeout(() => window.close(), 2000);
          } else {
            // Redirect to settings after 3 seconds
            setTimeout(() => navigate('/settings'), 3000);
          }
          return;
        }

        // Validate required parameters
        if (!code || !stateToken) {
          throw new Error('Missing authorization code or state token');
        }

        // Exchange code for tokens via backend
        const response = await apiService.post<CallbackResult>(
          `/api/integrations/${provider}/callback`,
          {
            code,
            state: stateToken
          }
        );

        if (response.success) {
          setState('success');
          setResult(response);

          // Message parent window if popup
          if (popup) {
            window.opener?.postMessage(
              {
                type: 'oauth-callback',
                provider,
                success: true,
                data: response.data
              },
              window.location.origin
            );

            // Close popup after brief delay
            setTimeout(() => window.close(), 1500);
          } else {
            // Redirect to settings after 2 seconds
            setTimeout(() => navigate('/settings'), 2000);
          }
        } else {
          throw new Error(response.message || 'Failed to complete OAuth flow');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setState('error');

        const errorMessage = error instanceof Error
          ? error.message
          : 'An unexpected error occurred';

        setResult({
          success: false,
          message: errorMessage
        });

        // Message parent window if popup
        if (popup) {
          window.opener?.postMessage(
            {
              type: 'oauth-callback',
              provider,
              success: false,
              error: errorMessage
            },
            window.location.origin
          );

          // Close popup after brief delay
          setTimeout(() => window.close(), 3000);
        } else {
          // Stay on page to show error
        }
      }
    };

    handleCallback();
  }, [searchParams, provider, navigate]);

  // Provider display names
  const providerNames: Record<typeof provider, string> = {
    google: 'Google',
    figma: 'Figma',
    slack: 'Slack',
    github: 'GitHub'
  };

  const providerName = providerNames[provider];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {providerName} Integration
            </h1>
            <p className="text-neutral-600">
              {isPopup ? 'Completing authorization...' : 'Connecting your account...'}
            </p>
          </div>

          {/* Status Display */}
          <div className="flex flex-col items-center justify-center py-8">
            {state === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 text-primary-600 animate-spin mb-4" />
                <p className="text-neutral-700 font-medium">
                  Processing authorization...
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  Please wait while we connect your {providerName} account
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success-600" />
                </div>
                <p className="text-neutral-900 font-semibold text-lg mb-2">
                  Connection Successful!
                </p>
                <p className="text-neutral-600 text-center">
                  {result?.data?.accountName
                    ? `Connected to ${result.data.accountName}`
                    : `Your ${providerName} account has been connected`}
                </p>
                {result?.data?.permissions && (
                  <div className="mt-4 text-sm text-neutral-500">
                    <p className="font-medium mb-1">Permissions granted:</p>
                    <ul className="space-y-1">
                      {result.data.permissions.slice(0, 3).map((permission, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-success-600" />
                          {permission}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isPopup ? (
                  <p className="text-sm text-neutral-500 mt-4">
                    This window will close automatically...
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500 mt-4">
                    Redirecting to Settings...
                  </p>
                )}
              </>
            )}

            {state === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mb-4">
                  <XCircle className="w-10 h-10 text-danger-600" />
                </div>
                <p className="text-neutral-900 font-semibold text-lg mb-2">
                  Connection Failed
                </p>
                <p className="text-neutral-600 text-center mb-4">
                  {result?.message || 'An error occurred while connecting your account'}
                </p>

                {/* Error recovery guidance */}
                <div className="w-full bg-warning-50 border border-warning-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning-900 mb-2">Try again:</p>
                      <ul className="space-y-1 text-warning-800">
                        <li>• Make sure you grant all requested permissions</li>
                        <li>• Check your {providerName} account is active</li>
                        <li>• Try disabling popup blockers if needed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!isPopup && (
                  <button
                    onClick={() => navigate('/settings')}
                    className="mt-6 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Return to Settings
                  </button>
                )}

                {isPopup && (
                  <p className="text-sm text-neutral-500 mt-4">
                    This window will close automatically...
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-500">
              Having trouble? Visit our{' '}
              <a href="/help" className="text-primary-600 hover:underline">
                Help Center
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
