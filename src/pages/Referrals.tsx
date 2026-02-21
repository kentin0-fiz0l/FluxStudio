/**
 * Referrals Page — share your referral link and track invited friends.
 *
 * Sprint 44: Phase 6.3 Growth & Engagement
 */

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/templates';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, Gift, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralStats {
  totalReferrals: number;
  converted: number;
  firstReferral: string | null;
  latestReferral: string | null;
}

interface RecentReferral {
  name: string;
  email: string | null;
  signedUpAt: string;
  converted: boolean;
}

export default function Referrals() {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  useEffect(() => {
    async function load() {
      try {
        const [codeRes, statsRes] = await Promise.all([
          fetch('/api/referrals/code', { headers }),
          fetch('/api/referrals/stats', { headers }),
        ]);
        const codeData = await codeRes.json();
        const statsData = await statsRes.json();
        if (codeData.success) setCode(codeData.code);
        if (statsData.success) {
          setStats(statsData.stats);
          setRecentReferrals(statsData.recentReferrals || []);
        }
      } catch {
        // Graceful failure
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const referralUrl = code
    ? `${window.location.origin}/signup?ref=${code}`
    : null;

  const handleCopy = useCallback(() => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referralUrl]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Invite Friends</h1>
          <p className="text-neutral-400 mt-1">
            Share your referral link and grow the FluxStudio community.
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">Your Referral Link</h2>
              <p className="text-sm text-neutral-500">Anyone who signs up with this link will be tracked as your referral.</p>
            </div>
          </div>

          {referralUrl && (
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-neutral-300 truncate">
                {referralUrl}
              </code>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-neutral-100">{stats.totalReferrals}</div>
              <div className="text-sm text-neutral-500">Total Referrals</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
              <ArrowRight className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-neutral-100">{stats.converted}</div>
              <div className="text-sm text-neutral-500">Created a Project</div>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {recentReferrals.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Recent Referrals
            </h3>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
              {recentReferrals.map((ref, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{ref.name || 'Anonymous'}</div>
                    {ref.email && (
                      <div className="text-xs text-neutral-500">{ref.email}</div>
                    )}
                  </div>
                  <div className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    ref.converted
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-neutral-800 text-neutral-500'
                  )}>
                    {ref.converted ? 'Converted' : 'Signed Up'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
