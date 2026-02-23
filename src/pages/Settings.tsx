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
import { SEOHead } from '../components/SEOHead';
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
  Clock,
  Camera,
  User,
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

  // Notification category preferences
  const [notifyMessages, setNotifyMessages] = React.useState(true);
  const [notifyProjectUpdates, setNotifyProjectUpdates] = React.useState(true);
  const [notifyCollabInvites, setNotifyCollabInvites] = React.useState(true);
  const [notifySystemAlerts, setNotifySystemAlerts] = React.useState(true);

  // Notification frequency & quiet hours
  const [notifFrequency, setNotifFrequency] = React.useState<'realtime' | 'hourly' | 'daily'>('realtime');
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(false);
  const [quietHoursStart, setQuietHoursStart] = React.useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = React.useState('08:00');

  // Profile avatar
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

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

    document.title = 'Settings | Flux Studio';
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
          setNotifFrequency(settings.notifications?.frequency ?? 'realtime');
          setQuietHoursEnabled(settings.notifications?.quietHours?.enabled ?? false);
          setQuietHoursStart(settings.notifications?.quietHours?.startTime ?? '22:00');
          setQuietHoursEnd(settings.notifications?.quietHours?.endTime ?? '08:00');
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
      notifFrequency !== (originalSettings.notifications?.frequency ?? 'realtime') ||
      quietHoursEnabled !== (originalSettings.notifications?.quietHours?.enabled ?? false) ||
      quietHoursStart !== (originalSettings.notifications?.quietHours?.startTime ?? '22:00') ||
      quietHoursEnd !== (originalSettings.notifications?.quietHours?.endTime ?? '08:00') ||
      darkMode !== (originalSettings.appearance?.darkMode ?? false) ||
      autoSave !== (originalSettings.performance?.autoSave ?? true);

    setHasChanges(hasChanged);
  }, [notifications, emailDigest, notifFrequency, quietHoursEnabled, quietHoursStart, quietHoursEnd, darkMode, autoSave, originalSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings: UserSettings = {
        notifications: {
          push: notifications,
          emailDigest: emailDigest,
          frequency: notifFrequency,
          quietHours: {
            enabled: quietHoursEnabled,
            startTime: quietHoursStart,
            endTime: quietHoursEnd,
          },
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
        // Build descriptive toast
        const changes: string[] = [];
        if (originalSettings?.notifications?.push !== notifications) changes.push('push notifications');
        if (originalSettings?.notifications?.emailDigest !== emailDigest) changes.push('email digest');
        if (originalSettings?.notifications?.frequency !== notifFrequency) changes.push('notification frequency');
        if (originalSettings?.notifications?.quietHours?.enabled !== quietHoursEnabled ||
            originalSettings?.notifications?.quietHours?.startTime !== quietHoursStart ||
            originalSettings?.notifications?.quietHours?.endTime !== quietHoursEnd) {
          changes.push(quietHoursEnabled ? `quiet hours (${quietHoursStart}–${quietHoursEnd})` : 'quiet hours');
        }
        if (originalSettings?.appearance?.darkMode !== darkMode) changes.push('dark mode');
        if (originalSettings?.performance?.autoSave !== autoSave) changes.push('auto-save');
        const desc = changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'Settings saved';
        toast.success(desc);
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

  // Avatar handling
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size (max 5MB)
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleAvatarSelect(fakeEvent);
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
      <SEOHead title="Settings" description="Manage your Flux Studio account settings, preferences, and notifications." noindex />
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

        {/* Profile Section */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Profile</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Your public profile and avatar</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div
              className="relative group cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleAvatarDrop}
              role="button"
              tabIndex={0}
              aria-label="Upload profile picture"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') avatarInputRef.current?.click(); }}
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600">
                {avatarPreview || user?.avatar ? (
                  <img
                    src={avatarPreview || user?.avatar}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-white">{userInitials}</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
                aria-label="Choose avatar image"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {user?.name || 'User'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user?.email}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Click avatar to upload a new photo (max 5MB)
              </p>
            </div>
          </div>
        </Card>

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

              {/* Notification Categories */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wide">Categories</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Messages</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">New messages and replies</p>
                    </div>
                    <Switch checked={notifyMessages} onCheckedChange={setNotifyMessages} aria-label="Toggle message notifications" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Project Updates</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Task changes, file uploads, milestones</p>
                    </div>
                    <Switch checked={notifyProjectUpdates} onCheckedChange={setNotifyProjectUpdates} aria-label="Toggle project update notifications" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Collaboration Invites</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Team and project invitations</p>
                    </div>
                    <Switch checked={notifyCollabInvites} onCheckedChange={setNotifyCollabInvites} aria-label="Toggle collaboration invite notifications" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">System Alerts</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Security, maintenance, and account</p>
                    </div>
                    <Switch checked={notifySystemAlerts} onCheckedChange={setNotifySystemAlerts} aria-label="Toggle system alert notifications" />
                  </div>
                </div>
              </div>

              {/* Delivery Frequency & Quiet Hours */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wide">Delivery & Schedule</h3>
                <div className="space-y-3">
                  {/* Frequency */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Notification Frequency</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">How often you receive notification digests</p>
                    </div>
                    <select
                      value={notifFrequency}
                      onChange={(e) => setNotifFrequency(e.target.value as 'realtime' | 'hourly' | 'daily')}
                      className="text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      aria-label="Notification frequency"
                    >
                      <option value="realtime">Real-time</option>
                      <option value="hourly">Hourly digest</option>
                      <option value="daily">Daily digest</option>
                    </select>
                  </div>

                  {/* Quiet Hours Toggle */}
                  <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                        <div>
                          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Quiet Hours</h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Mute notifications during set hours</p>
                        </div>
                      </div>
                      <Switch
                        checked={quietHoursEnabled}
                        onCheckedChange={setQuietHoursEnabled}
                        aria-label="Toggle quiet hours"
                      />
                    </div>

                    {/* Time pickers — only shown when enabled */}
                    {quietHoursEnabled && (
                      <div className="pl-6 space-y-2">
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-neutral-600 dark:text-neutral-300">From</label>
                          <input
                            type="time"
                            value={quietHoursStart}
                            onChange={(e) => setQuietHoursStart(e.target.value)}
                            className="text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-2 py-1 focus:ring-2 focus:ring-primary-500"
                            aria-label="Quiet hours start time"
                          />
                          <label className="text-xs text-neutral-600 dark:text-neutral-300">To</label>
                          <input
                            type="time"
                            value={quietHoursEnd}
                            onChange={(e) => setQuietHoursEnd(e.target.value)}
                            className="text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-2 py-1 focus:ring-2 focus:ring-primary-500"
                            aria-label="Quiet hours end time"
                          />
                        </div>
                        {quietHoursStart === quietHoursEnd && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Start and end times are the same — quiet hours will have no effect.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                <Monitor className="w-4 h-4" aria-hidden="true" />
                Manage Sessions
              </a>
            </div>
          </Card>

          {/* Data & Privacy (GDPR) */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Data & Privacy</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Manage data exports, consent preferences, and account deletion</p>
              </div>
            </div>
            <Link
              to="/settings/privacy"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              Privacy Settings
            </Link>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          {hasChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
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
