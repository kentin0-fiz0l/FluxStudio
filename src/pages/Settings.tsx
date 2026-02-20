/**
 * Settings Page - Flux Design Language
 *
 * Application settings and preferences page using DashboardLayout.
 * Persists user preferences to the backend API.
 */

import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Moon,
  Sun,
  Save,
  Puzzle,
  Loader2,
  Monitor,
  Download,
  Trash2,
} from 'lucide-react';
import { FigmaIntegration } from '@/components/organisms/FigmaIntegration';
import { SlackIntegration } from '@/components/organisms/SlackIntegration';
import { GitHubIntegration } from '@/components/organisms/GitHubIntegration';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { toast } from '../lib/toast';
import { apiService, type UserSettings } from '../services/apiService';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  // Settings state
  const [notifications, setNotifications] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoSave, setAutoSave] = React.useState(true);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Track original settings for change detection
  const [originalSettings, setOriginalSettings] = React.useState<UserSettings | null>(null);

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    document.title = 'Settings - FluxStudio V3.6';
    (window as Window & { __SETTINGS_V36_LOADED?: boolean }).__SETTINGS_V36_LOADED = true;
  }, [user, navigate]);

  // Fetch settings on mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getSettings();

        if (response.success && response.data?.settings) {
          const settings = response.data.settings;

          // Apply fetched settings to state
          setNotifications(settings.notifications?.push ?? true);
          setEmailDigest(settings.notifications?.emailDigest ?? true);
          setDarkMode(settings.appearance?.darkMode ?? false);
          setAutoSave(settings.performance?.autoSave ?? true);

          // Store original settings
          setOriginalSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Use defaults on error - don't show error toast for initial load
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Detect changes from original settings
  React.useEffect(() => {
    if (!originalSettings) {
      setHasChanges(false);
      return;
    }

    const hasChanged =
      notifications !== (originalSettings.notifications?.push ?? true) ||
      emailDigest !== (originalSettings.notifications?.emailDigest ?? true) ||
      darkMode !== (originalSettings.appearance?.darkMode ?? false) ||
      autoSave !== (originalSettings.performance?.autoSave ?? true);

    setHasChanges(hasChanged);
  }, [notifications, emailDigest, darkMode, autoSave, originalSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings: UserSettings = {
        notifications: {
          push: notifications,
          emailDigest: emailDigest
        },
        appearance: {
          darkMode: darkMode
        },
        performance: {
          autoSave: autoSave
        }
      };

      const response = await apiService.saveSettings(settings);

      if (response.success) {
        toast.success('Settings saved successfully');
        // Update original settings to current
        setOriginalSettings(settings);
        setHasChanges(false);
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings. Please try again.');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
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
          <Link
            to="/projects"
            className="inline-block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2"
          >
            ← Back to Projects
          </Link>
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

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-h-[3.5rem]">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{t('language.select')}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('language.current')}</p>
                  </div>
                </div>
                <LanguageSwitcher variant="default" />
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

            <div className="space-y-4">
              <button
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left min-h-[56px]"
                aria-label="Change Password - Update your password"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Change Password</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Update your password</p>
                  </div>
                  <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                </div>
              </button>

              {/* Two-Factor Authentication — Sprint 41 */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <TwoFactorSetup
                  is2FAEnabled={false}
                  onStatusChange={(enabled) => toast.success(enabled ? '2FA enabled' : '2FA disabled')}
                />
              </div>
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

        {/* Active Sessions & Data — Sprint 41 */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          {/* Active Sessions */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Active Sessions</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Manage your active login sessions</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                View and revoke sessions where you're signed in.
              </p>
              <a
                href="/settings/sessions"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Monitor className="w-4 h-4" />
                Manage Sessions
              </a>
            </div>
          </Card>

          {/* Data & Privacy (GDPR) */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-orange-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Data & Privacy</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Export or delete your data</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                  const API_URL = import.meta.env.VITE_API_URL || '';
                  const res = await fetch(`${API_URL}/api/account/export`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) { toast.error('Export failed'); return; }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'fluxstudio-data-export.json';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Data export downloaded');
                }}
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Export My Data</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Download all your personal data as JSON</p>
                  </div>
                  <Download className="w-5 h-5 text-neutral-400" aria-hidden="true" />
                </div>
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure? Your account will be permanently deleted after 30 days.')) return;
                  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                  const API_URL = import.meta.env.VITE_API_URL || '';
                  const res = await fetch(`${API_URL}/api/account/delete`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  });
                  if (!res.ok) { toast.error('Failed to request deletion'); return; }
                  toast.success('Account deletion scheduled. You have 30 days to cancel.');
                }}
                className="w-full p-4 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-700 dark:text-red-400">Delete My Account</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">Permanently delete your account and all data (30-day cooling off)</p>
                  </div>
                  <Trash2 className="w-5 h-5 text-red-400" aria-hidden="true" />
                </div>
              </button>
            </div>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || !hasChanges}
            variant={hasChanges ? 'primary' : 'outline'}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Loading...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                {hasChanges ? 'Save Changes' : 'Saved'}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
