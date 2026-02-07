/**
 * NotFound Page (404) - Flux Design Language
 *
 * Displayed when a user navigates to a non-existent route.
 * Provides helpful navigation options and search suggestions.
 *
 * @example Route configuration:
 * <Route path="*" element={<NotFound />} />
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, Folder, MessageSquare, Settings, FileQuestion } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

interface QuickLink {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const quickLinks: QuickLink[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="h-5 w-5" />,
    description: 'Go to your main dashboard',
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: <Folder className="h-5 w-5" />,
    description: 'Browse your projects',
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Check your messages',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="h-5 w-5" />,
    description: 'Manage your account',
  },
];

export function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract potential search term from the attempted path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const suggestedSearch = pathSegments[pathSegments.length - 1]?.replace(/[-_]/g, ' ');

  const handleSearch = () => {
    if (suggestedSearch) {
      navigate(`/search?q=${encodeURIComponent(suggestedSearch)}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* 404 Illustration */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <div className="relative">
              <FileQuestion
                className="h-32 w-32 text-neutral-200 dark:text-neutral-700"
                strokeWidth={1}
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-primary-600 dark:text-primary-400">
                  404
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Page Not Found
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 font-mono">
            {location.pathname}
          </p>
        </div>

        {/* Search Suggestion */}
        {suggestedSearch && suggestedSearch.length > 2 && (
          <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Looking for "{suggestedSearch}"?
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Try searching for it instead
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSearch}
                  icon={<Search className="h-4 w-4" />}
                >
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="h-4 w-4" />}
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-700">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg transition-colors',
                  'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
                  'hover:border-primary-300 dark:hover:border-primary-700',
                  'hover:bg-primary-50 dark:hover:bg-primary-900/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
                )}
              >
                <div className="text-primary-600 dark:text-primary-400">
                  {link.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {link.label}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden md:block">
                    {link.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Help */}
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Need help?{' '}
          <Link
            to="/support"
            className="text-primary-600 dark:text-primary-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default NotFound;
