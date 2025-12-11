/**
 * Tools Page - External Tools & Applications
 *
 * Follows the Flux Design Language pattern with DashboardLayout.
 * Displays external tools and applications that integrate with FluxStudio.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Card, Button } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  Map,
  ExternalLink,
  Zap,
  Star,
  Wrench,
  Sparkles
} from 'lucide-react';

function Tools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      console.log('⚠️  User not authenticated, redirecting to login...');
      navigate('/login', { replace: true });
      return;
    }

    document.title = 'Tools - FluxStudio';
    console.log('=== TOOLS PAGE LOADING ===');
    console.log('✅ User authenticated:', user.email);
  }, [user, navigate]);

  const handleLaunchMetMap = () => {
    window.open('https://metmap.art', '_blank', 'noopener,noreferrer');
  };

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Tools' }]}
      onLogout={logout}
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-primary-600" aria-hidden="true" />
            Tools
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Extend your FluxStudio workflow with powerful external tools and applications.
          </p>
        </div>

        {/* Featured Tools Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Featured Tools
            </h2>
          </div>

          {/* MetMap Card */}
          <Card className="p-6 relative overflow-visible">
            {/* NEW Badge */}
            <div className="absolute -top-3 -right-3 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              NEW
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Map className="w-10 h-10 text-white" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    MetMap
                  </h3>
                  <span className="inline-block mt-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs rounded-full">
                    Productivity
                  </span>
                </div>

                <p className="text-neutral-600 dark:text-neutral-300">
                  Transform your meetings with AI-driven transcription, smart summaries,
                  and actionable insights. MetMap helps teams capture every important
                  detail and turn conversations into organized, searchable knowledge.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Zap className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    AI Meeting Transcription
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Zap className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Smart Summaries
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Zap className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Action Item Extraction
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Zap className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Searchable Archives
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <Button
                    onClick={handleLaunchMetMap}
                    className="shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                    Launch MetMap
                  </Button>
                  <a
                    href="https://metmap.art"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                  >
                    metmap.art
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="p-6 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                More tools coming soon
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                We're working on integrating more powerful tools to enhance your creative workflow.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/60 dark:bg-white/10 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                  AI Design Assistant
                </span>
                <span className="px-3 py-1 bg-white/60 dark:bg-white/10 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                  Asset Library
                </span>
                <span className="px-3 py-1 bg-white/60 dark:bg-white/10 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                  Analytics Dashboard
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default Tools;
