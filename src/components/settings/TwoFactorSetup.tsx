/**
 * TwoFactorSetup — Settings panel for enabling/disabling 2FA
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 */

import { useState } from 'react';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface TwoFactorSetupProps {
  is2FAEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

export function TwoFactorSetup({ is2FAEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/verify-setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBackupCodes(data.backupCodes || []);
      setStep('idle');
      onStatusChange(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('idle');
      setCode('');
      setBackupCodes([]);
      onStatusChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Two-Factor Authentication</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {is2FAEnabled ? 'Enabled — your account is protected with TOTP' : 'Add an extra layer of security to your account'}
            </p>
          </div>
        </div>
        {step === 'idle' && (
          <button
            onClick={() => is2FAEnabled ? setStep('disable') : handleSetup()}
            disabled={loading}
            aria-label={is2FAEnabled ? 'Disable two-factor authentication' : 'Enable two-factor authentication'}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              is2FAEnabled
                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'text-white bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : is2FAEnabled ? 'Disable' : 'Enable 2FA'}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Setup: Show QR code */}
      {step === 'verify' && qrCode && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
          <div className="flex justify-center">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center font-mono break-all">
            Manual entry: {secret}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="Enter 6-digit code"
              aria-label="Enter 6-digit verification code"
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg text-center font-mono text-lg tracking-widest"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              aria-label="Verify authentication code"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </button>
          </div>
          <button onClick={() => { setStep('idle'); setCode(''); }} aria-label="Cancel setup" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
            Cancel
          </button>
        </div>
      )}

      {/* Disable: Require current code */}
      {step === 'disable' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-red-500" aria-hidden="true" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Disable Two-Factor Authentication</p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">Enter your current 2FA code to confirm.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="Enter 6-digit code"
              aria-label="Enter current 2FA code to disable"
              className="flex-1 px-3 py-2 border border-red-300 dark:border-red-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg text-center font-mono text-lg tracking-widest"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button
              onClick={handleDisable}
              disabled={loading || code.length < 6}
              aria-label="Confirm disable two-factor authentication"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </button>
          </div>
          <button onClick={() => { setStep('idle'); setCode(''); }} aria-label="Cancel disabling 2FA" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
            Cancel
          </button>
        </div>
      )}

      {/* Show backup codes after enabling */}
      {backupCodes.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Save your backup codes</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">These are single-use codes for when you can't use your authenticator. Store them securely.</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm">
            {backupCodes.map((c, i) => (
              <div key={i} className="px-2 py-1 bg-white dark:bg-neutral-800 rounded border border-yellow-300 dark:border-yellow-700 text-neutral-900 dark:text-neutral-100 text-center">{c}</div>
            ))}
          </div>
          <button
            onClick={() => setBackupCodes([])}
            className="text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 underline"
          >
            I've saved my codes
          </button>
        </div>
      )}
    </div>
  );
}
