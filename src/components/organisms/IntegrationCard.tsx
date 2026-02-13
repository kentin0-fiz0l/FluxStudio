/**
 * IntegrationCard Component
 * Reusable card for OAuth integrations with error handling and accessibility
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { IntegrationProvider, Integration } from '@/types/integrations';
import { INTEGRATION_CONFIGS } from '@/types/integrations';
import { useOAuth } from '@/hooks/useOAuth';

// Status indicator component - extracted to module level
interface StatusIndicatorProps {
  isConnecting: boolean;
  isExpired: boolean;
  isConnected: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnecting, isExpired, isConnected }) => {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
        <XCircle className="h-4 w-4" />
        <span>Connection expired</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
        <CheckCircle className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      <div className="h-2 w-2 rounded-full bg-neutral-400" />
      <span>Not connected</span>
    </div>
  );
};

interface IntegrationCardProps {
  provider: IntegrationProvider;
  onSuccess?: (integration: Integration) => void;
  onError?: (error: unknown) => void;
  children?: React.ReactNode;
}

export function IntegrationCard({
  provider,
  onSuccess,
  onError,
  children
}: IntegrationCardProps) {
  const config = INTEGRATION_CONFIGS[provider];
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const {
    isConnecting,
    isConnected,
    error,
    integration,
    statusMessage,
    connect,
    disconnect,
    reconnect,
    clearError
  } = useOAuth(provider, { onSuccess, onError });

  // Calculate token expiration warning
  const getExpirationWarning = (): { show: boolean; daysRemaining: number } | null => {
    if (!integration?.expiresAt) return null;

    const expiresAt = new Date(integration.expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 7) {
      return { show: true, daysRemaining };
    }

    return null;
  };

  const expirationWarning = getExpirationWarning();
  const isExpired = integration?.status === 'expired';

  const handleConnect = () => {
    // Show permission review dialog before connecting
    setShowPermissionDialog(true);
  };

  const handleConfirmConnect = async () => {
    setShowPermissionDialog(false);
    clearError();
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDisconnectDialog(false);
  };

  const handleReconnect = async () => {
    clearError();
    await reconnect();
  };

  const handleRetry = async () => {
    clearError();
    await connect();
  };


  return (
    <Card className="p-4 md:p-6 relative">
      {/* Loading overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-2" />
          <p className="text-sm text-neutral-700 dark:text-neutral-100">
            {statusMessage || 'Opening authorization...'}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Provider icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: config.color }}
          >
            {config.name.charAt(0)}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {config.name}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {config.description}
            </p>
          </div>
        </div>

        <StatusIndicator isConnecting={isConnecting} isExpired={isExpired} isConnected={isConnected} />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-error-900 dark:text-error-100 mb-1">
                Connection Failed
              </h4>
              <p className="text-sm text-error-700 dark:text-error-300">
                {error.message}
              </p>
              {error.code === 'POPUP_BLOCKED' && (
                <p className="text-xs text-error-600 dark:text-error-400 mt-2">
                  Please allow popups for this site in your browser settings and try again.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
            <Button size="sm" variant="ghost" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Expiration warning */}
      {expirationWarning && expirationWarning.show && !isExpired && (
        <div className="mb-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-warning-900 dark:text-warning-100">
                Connection expiring in {expirationWarning.daysRemaining} day
                {expirationWarning.daysRemaining !== 1 ? 's' : ''}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleReconnect}>
              Reconnect Now
            </Button>
          </div>
        </div>
      )}

      {/* Expired state */}
      {isExpired && (
        <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-error-900 dark:text-error-100">
                Your {config.name} connection has expired
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleReconnect}>
              Reconnect
            </Button>
          </div>
        </div>
      )}

      {/* Features list */}
      {!isConnected && (
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Features:
          </p>
          <ul className="space-y-2">
            {config.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Permissions list */}
      {isConnected && (
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Permissions:
          </p>
          <ul className="space-y-2">
            {config.permissions.map((permission, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {permission.name}
                  </span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    {permission.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Custom children (for provider-specific content) */}
      {children && <div className="mb-4">{children}</div>}

      {/* Permission Review Dialog */}
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: config.color }}
              >
                {config.name.charAt(0)}
              </div>
              Connect to {config.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                FluxStudio will request the following permissions from your {config.name} account:
              </p>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <ul className="space-y-3">
                  {config.permissions.map((permission, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {permission.name}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                          {permission.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-primary-900 dark:text-primary-100 mb-1">
                  Security Notice
                </p>
                <p className="text-primary-800 dark:text-primary-200 text-xs">
                  FluxStudio uses OAuth 2.0 for secure authentication. Your credentials are never stored.
                  You can revoke access at any time from your {config.name} account settings.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmConnect}
              style={{ backgroundColor: config.color }}
              className="text-white hover:opacity-90"
            >
              Authorize & Connect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Actions */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            loading={isConnecting}
            fullWidth
            aria-label={`Connect to ${config.name}`}
            aria-busy={isConnecting}
          >
            Connect {config.name}
          </Button>
        ) : (
          <>
            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isConnecting}
                  aria-label={`Disconnect from ${config.name}`}
                >
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {config.name}?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This will remove FluxStudio's access to your {config.name} account.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-error-600 mt-0.5 flex-shrink-0" />
                        <span>You won't be able to use {config.name} features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success-600 mt-0.5 flex-shrink-0" />
                        <span>Existing imported data will remain available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <span>You can reconnect at any time</span>
                      </li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-error-600 hover:bg-error-700 text-white"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="ghost"
              size="sm"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(`https://${provider}.com`, '_blank')}
              aria-label={`Open ${config.name} in new tab`}
            >
              Open {config.name}
            </Button>
          </>
        )}
      </div>

      {/* ARIA live region for status announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>
    </Card>
  );
}
