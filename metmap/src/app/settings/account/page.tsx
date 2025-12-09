'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mail, User, Calendar, Shield, LogOut, Edit3, Check, X, Loader2 } from 'lucide-react';

export default function AccountPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/settings/account');
    }
  }, [status, router]);

  // Initialize edit name when session loads
  useEffect(() => {
    if (session?.user?.name) {
      setEditName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update name');
      }

      // Update the session with the new name
      await updateSession({ name: data.user.name });

      setIsEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(session?.user?.name || '');
    setIsEditingName(false);
    setError(null);
  };

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-hw-charcoal flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-hw-brass border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const createdAt = new Date().toLocaleDateString(); // We don't have createdAt in session

  return (
    <div className="min-h-screen bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/settings"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Account</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-hw-surface rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-hw-brass flex items-center justify-center shadow-knob overflow-hidden">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <span className="text-hw-charcoal font-bold text-3xl">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {user.name || 'User'}
              </h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="h-px bg-hw-charcoal mb-6" />

          {error && (
            <div className="mb-4 p-3 bg-hw-red/10 border border-hw-red/30 rounded-lg text-hw-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Editable Name Field */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Display Name
                </p>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-hw-brass"
                      placeholder="Enter your name"
                      autoFocus
                      disabled={saving}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving || !editName.trim()}
                      className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="p-2 text-gray-400 hover:bg-hw-charcoal rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-white">{user.name || 'Not set'}</p>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-gray-500 hover:text-hw-brass rounded transition-colors"
                      title="Edit name"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Email
                </p>
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Member since
                </p>
                <p className="text-white">{createdAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Connected Accounts
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Email & Password</p>
                <p className="text-sm text-gray-400">Primary login method</p>
              </div>
              <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Flux Studio Connection */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Flux Studio
          </h2>
          <div className="bg-hw-surface rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-hw-brass/20 flex items-center justify-center">
                <span className="text-hw-brass font-bold">F</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Flux Studio Account</p>
                <p className="text-sm text-gray-400">
                  Your MetMap account works across all Flux Studio apps
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Account Actions
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 p-4 w-full text-left hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <LogOut className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Sign out</p>
                <p className="text-sm text-gray-400">
                  Sign out of your account on this device
                </p>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
