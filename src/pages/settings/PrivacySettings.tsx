/**
 * Privacy Settings Page — GDPR/CCPA Compliance
 *
 * Sprint 41 T2: User-facing privacy controls
 *
 * Features:
 * - "Download My Data" with export status tracking
 * - "Delete My Account" with 30-day grace period confirmation flow
 * - Consent toggles (marketing emails, analytics tracking, third-party sharing)
 */

import * as React from 'react';
import { DashboardLayout } from '../../components/templates';
import { Button, Card } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '../../contexts/AuthContext';
import {
  Download,
  Trash2,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '../../lib/toast';

const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

interface ConsentState {
  marketing_emails: boolean;
  analytics_tracking: boolean;
  third_party_sharing: boolean;
}

interface DeletionStatus {
  status: string;
  gracePeriodEnds: string | null;
  requestedAt: string | null;
}

function PrivacySettings() {
  const { user, logout } = useAuth();

  // Export state
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportId, setExportId] = React.useState<string | null>(null);

  // Deletion state
  const [deletionStatus, setDeletionStatus] = React.useState<DeletionStatus | null>(null);
  const [isRequestingDeletion, setIsRequestingDeletion] = React.useState(false);
  const [isCancellingDeletion, setIsCancellingDeletion] = React.useState(false);
  const [deleteReason, setDeleteReason] = React.useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Consent state
  const [consents, setConsents] = React.useState<ConsentState>({
    marketing_emails: false,
    analytics_tracking: false,
    third_party_sharing: false,
  });
  const [isSavingConsents, setIsSavingConsents] = React.useState(false);
  const [isLoadingConsents, setIsLoadingConsents] = React.useState(true);

  // Load consents and deletion status on mount
  React.useEffect(() => {
    loadConsents();
  }, []);

  async function loadConsents() {
    try {
      const res = await fetch(`${API_URL}/api/compliance/consents`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      setConsents({
        marketing_emails: data.consents.marketing_emails?.granted ?? false,
        analytics_tracking: data.consents.analytics_tracking?.granted ?? false,
        third_party_sharing: data.consents.third_party_sharing?.granted ?? false,
      });

      if (data.deletionStatus) {
        setDeletionStatus(data.deletionStatus);
      }
    } catch {
      console.error('[PrivacySettings] Failed to load consents');
    } finally {
      setIsLoadingConsents(false);
    }
  }

  // === Data Export ===

  async function handleRequestExport() {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/compliance/data-export`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (res.status === 429) {
        toast.error('You can only request one export every 24 hours.');
        return;
      }

      if (!res.ok) throw new Error('Export request failed');
      const data = await res.json();
      setExportId(data.exportId);
      toast.success('Data export is ready for download.');
    } catch {
      toast.error('Failed to request data export.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadExport() {
    if (!exportId) return;
    try {
      const res = await fetch(`${API_URL}/api/compliance/data-export/${exportId}/download`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fluxstudio-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded.');
    } catch {
      toast.error('Failed to download export.');
    }
  }

  // === Account Deletion ===

  async function handleRequestDeletion() {
    setIsRequestingDeletion(true);
    try {
      const res = await fetch(`${API_URL}/api/compliance/delete-account`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: deleteReason || undefined }),
      });
      if (!res.ok) throw new Error('Deletion request failed');
      const data = await res.json();
      setDeletionStatus({
        status: 'pending',
        gracePeriodEnds: data.gracePeriodEnds,
        requestedAt: data.requestedAt,
      });
      setShowDeleteConfirm(false);
      setDeleteReason('');
      toast.success('Account deletion scheduled. You have 30 days to cancel.');
    } catch {
      toast.error('Failed to request account deletion.');
    } finally {
      setIsRequestingDeletion(false);
    }
  }

  async function handleCancelDeletion() {
    setIsCancellingDeletion(true);
    try {
      const res = await fetch(`${API_URL}/api/compliance/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Cancel failed');
      setDeletionStatus(null);
      toast.success('Account deletion cancelled.');
    } catch {
      toast.error('Failed to cancel deletion.');
    } finally {
      setIsCancellingDeletion(false);
    }
  }

  // === Consent Toggles ===

  async function handleConsentChange(type: keyof ConsentState, granted: boolean) {
    const previous = consents[type];
    setConsents(prev => ({ ...prev, [type]: granted }));
    setIsSavingConsents(true);

    try {
      const res = await fetch(`${API_URL}/api/compliance/consents`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ consents: { [type]: granted } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Preference updated.');
    } catch {
      setConsents(prev => ({ ...prev, [type]: previous }));
      toast.error('Failed to save preference.');
    } finally {
      setIsSavingConsents(false);
    }
  }

  const hasPendingDeletion = deletionStatus?.status === 'pending';

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Settings', path: '/settings' }, { label: 'Privacy & Data' }]}
      onLogout={logout}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back to Settings */}
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Data Export Section */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Download My Data</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Export all your personal data in JSON format (GDPR Article 20)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Your export will include: profile information, projects, files metadata, messages, activity logs, and consent records. Limited to one export per 24 hours.
            </p>

            {exportId ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Export ready</p>
                </div>
                <Button onClick={handleDownloadExport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ) : (
              <Button onClick={handleRequestExport} disabled={isExporting} variant="outline">
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Request Data Export
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Consent Preferences */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Privacy Preferences</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Control how we use your data
              </p>
            </div>
          </div>

          {isLoadingConsents ? (
            <div className="flex items-center gap-2 py-4 text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading preferences...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Marketing Emails</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive product updates and feature announcements</p>
                </div>
                <Switch
                  checked={consents.marketing_emails}
                  onCheckedChange={(val: boolean) => handleConsentChange('marketing_emails', val)}
                  disabled={isSavingConsents}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Analytics Tracking</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Help us improve by sharing anonymous usage data</p>
                </div>
                <Switch
                  checked={consents.analytics_tracking}
                  onCheckedChange={(val: boolean) => handleConsentChange('analytics_tracking', val)}
                  disabled={isSavingConsents}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Third-Party Sharing</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Allow sharing data with integrated services</p>
                </div>
                <Switch
                  checked={consents.third_party_sharing}
                  onCheckedChange={(val: boolean) => handleConsentChange('third_party_sharing', val)}
                  disabled={isSavingConsents}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Account Deletion Section */}
        <Card className="p-4 md:p-6 border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Delete My Account</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Permanently delete your account and all personal data (GDPR Article 17)
              </p>
            </div>
          </div>

          {hasPendingDeletion ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Account deletion pending</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Your account is scheduled for permanent deletion.
                    {deletionStatus.gracePeriodEnds && (
                      <> Deletion will occur after{' '}
                        <strong>{new Date(deletionStatus.gracePeriodEnds).toLocaleDateString()}</strong>.
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-amber-600 dark:text-amber-500">
                    <Clock className="w-3 h-3" />
                    Requested {deletionStatus.requestedAt
                      ? new Date(deletionStatus.requestedAt).toLocaleDateString()
                      : 'recently'}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCancelDeletion}
                disabled={isCancellingDeletion}
                variant="outline"
              >
                {isCancellingDeletion ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Deletion
                  </>
                )}
              </Button>
            </div>
          ) : showDeleteConfirm ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Are you sure? This action will:
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                  <li>Schedule your account for permanent deletion after 30 days</li>
                  <li>Anonymize your messages in shared conversations</li>
                  <li>Delete all your personal data, files, and projects</li>
                  <li>Revoke all active sessions</li>
                </ul>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  You can cancel within the 30-day grace period.
                </p>
              </div>
              <div>
                <label
                  htmlFor="delete-reason"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Reason for leaving (optional)
                </label>
                <textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Help us improve by sharing why you're leaving..."
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRequestDeletion}
                  disabled={isRequestingDeletion}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isRequestingDeletion ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirm Delete Account
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteReason(''); }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Once you request deletion, you will have a 30-day grace period to cancel. After that, all your data will be permanently removed.
              </p>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Request Account Deletion
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default PrivacySettings;
