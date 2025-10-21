/**
 * Settings Page - Flux Design Language
 *
 * Application settings and preferences page using DashboardLayout.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import {
  Bell,
  Lock,
  Palette,
  Globe,
  Zap,
  Shield,
  Mail,
  Moon,
  Sun,
  Save,
  Puzzle
} from 'lucide-react';
import { FigmaIntegration } from '@/components/organisms/FigmaIntegration';
import { SlackIntegration } from '@/components/organisms/SlackIntegration';
import { GitHubIntegration } from '@/components/organisms/GitHubIntegration';

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      console.log('⚠️  User not authenticated, redirecting to login...');
      navigate('/login', { replace: true });
      return;
    }

    document.title = 'Settings - FluxStudio V3.6';
    (window as any).__SETTINGS_V36_LOADED = true;
    console.log('=== SETTINGS PAGE V3.6 LOADING ===');
    console.log('✅ User authenticated:', user.email);
  }, [user, navigate]);

  const [notifications, setNotifications] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);

  const handleSave = () => {
    console.log('Saving settings...');
    // Handle settings save
  };

  // Don't render settings page if not authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Settings' }]}
      onLogout={logout}
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Manage your application preferences and account settings
          </p>
        </div>

        {/* Integrations Section - Moved to Top */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <Puzzle className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Integrations</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Connect external services to enhance your workflow
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {/* Figma Integration */}
            <FigmaIntegration />

            {/* Slack Integration */}
            <SlackIntegration />

            {/* GitHub Integration */}
            <GitHubIntegration />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          {/* Notifications */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Manage notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-h-[3.5rem]">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Push Notifications</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Receive notifications in browser</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  aria-label="Toggle push notifications"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-h-[3.5rem]">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Email Digest</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Daily summary of activity</p>
                </div>
                <Switch
                  checked={emailDigest}
                  onCheckedChange={setEmailDigest}
                  aria-label="Toggle email digest"
                />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-secondary-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Appearance</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Customize the look and feel</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-h-[3.5rem]">
                <div className="flex items-center gap-3">
                  {darkMode ? (
                    <Moon className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  )}
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Dark Mode</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Use dark color scheme</p>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
              </div>
            </div>
          </Card>

          {/* Privacy & Security */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Privacy & Security</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Control your data and security</p>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Change Password</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Update your password</p>
                  </div>
                  <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                </div>
              </button>

              <button className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Two-Factor Auth</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Add extra security</p>
                  </div>
                  <Shield className="w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                </div>
              </button>
            </div>
          </Card>

          {/* Performance */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Performance</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Optimize your experience</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-h-[3.5rem]">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Auto-save</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Automatically save your work</p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                  aria-label="Toggle auto-save"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
