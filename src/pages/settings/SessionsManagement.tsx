/**
 * Sessions Management Page
 *
 * Lists active login sessions and allows users to revoke them.
 * Linked from Settings > Active Sessions.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { toast } from '@/lib/toast';
import {
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  ArrowLeft,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  // Simple UA parsing
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const device = isMobile ? 'Mobile' : 'Desktop';

  let browser = 'Unknown';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

function SessionsManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [revokingAll, setRevokingAll] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchSessions();
  }, [user, navigate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ success: boolean; sessions: Session[] }>('/auth/sessions');
      if (response.data?.success && response.data.sessions) {
        setSessions(response.data.sessions);
      } else {
        // If endpoint not available yet, show current session as fallback
        const ua = navigator.userAgent;
        const parsed = parseUserAgent(ua);
        setSessions([{
          id: 'current',
          device: parsed.device,
          browser: parsed.browser,
          os: parsed.os,
          ip: '',
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
        }]);
      }
    } catch {
      // Fallback: show current session
      const ua = navigator.userAgent;
      const parsed = parseUserAgent(ua);
      setSessions([{
        id: 'current',
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        ip: '',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isCurrent: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await apiService.delete(`/auth/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      await apiService.delete('/auth/sessions');
      setSessions(prev => prev.filter(s => s.isCurrent));
      toast.success('All other sessions revoked');
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[
        { label: 'Settings', path: '/settings' },
        { label: 'Active Sessions' },
      ]}
      onLogout={logout}
    >
      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
            <Monitor className="w-7 h-7 text-blue-600" aria-hidden="true" />
            Active Sessions
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            View and manage devices where you're currently signed in.
          </p>
        </div>

        {/* Revoke All Button */}
        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              {revokingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              Revoke All Other Sessions
            </Button>
          </div>
        )}

        {/* Sessions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Card key={session.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      {session.device === 'Mobile' ? (
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      ) : (
                        <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {session.browser} on {session.os}
                        </span>
                        {session.isCurrent && (
                          <Badge variant="success" size="sm">This device</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {session.ip && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" aria-hidden="true" />
                            {session.location || session.ip}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Last active {formatTimeAgo(session.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revoking === session.id}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {revoking === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span className="ml-1.5">Revoke</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Security Note */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Security Tip
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                If you see a session you don't recognize, revoke it immediately and change your password.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default SessionsManagement;
