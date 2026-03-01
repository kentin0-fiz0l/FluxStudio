/**
 * RouteErrorBoundary - for use with React Router's errorElement.
 * Catches errors during route rendering/loading and shows a recovery UI.
 */

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export function RouteErrorBoundary() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeError: any = null;
  try {
    // Dynamic import to avoid hard dependency when component is used outside router
    // useRouteError is only available inside a RouterProvider context
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require to avoid hard dependency outside router context
    const { useRouteError } = require('react-router-dom');
    routeError = useRouteError(); // eslint-disable-line react-hooks/rules-of-hooks -- intentionally conditional: only available inside RouterProvider
  } catch {
    // Not inside a router context
  }

  const error = routeError instanceof Error ? routeError : new Error(String(routeError ?? 'Unknown route error'));
  const is404 = routeError && typeof routeError === 'object' && 'status' in routeError && routeError.status === 404;

  if (is404) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Page Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.history.back()}>Go Back</Button>
              <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Something went wrong
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'An unexpected error occurred while loading this page.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Reload
            </Button>
            <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
