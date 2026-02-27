/**
 * SSO Settings Admin Page - Flux Studio (Sprint 62)
 *
 * Manages SAML SSO configuration, domain verification, and SSO event logs.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';
import { useAuth } from '@/store/slices/authSlice';
import {
  Shield,
  Globe,
  Activity,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const TABS = [
  { id: 'saml', label: 'SAML Configuration', icon: Shield },
  { id: 'domains', label: 'Domain Verification', icon: Globe },
  { id: 'events', label: 'SSO Events', icon: Activity },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface SamlConfig {
  idpSsoUrl: string;
  idpCertificate: string;
  entityId: string;
  attributeMapping: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  wantAssertionsSigned: boolean;
  autoProvision: boolean;
  defaultRole: string;
  isActive: boolean;
}

interface Domain {
  id: string;
  domain: string;
  status: 'verified' | 'pending';
  verification_token?: string;
  verificationToken?: string;
}

interface SsoEvent {
  id: string;
  event_type: string;
  user_email?: string;
  ip_address?: string;
  created_at: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function SSOSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = user?.organizationId;

  const [activeTab, setActiveTab] = useState<TabId>('saml');

  // SAML form state
  const [idpSsoUrl, setIdpSsoUrl] = useState('');
  const [idpCertificate, setIdpCertificate] = useState('');
  const [entityId, setEntityId] = useState('');
  const [emailAttr, setEmailAttr] = useState('');
  const [firstNameAttr, setFirstNameAttr] = useState('');
  const [lastNameAttr, setLastNameAttr] = useState('');
  const [signRequests, setSignRequests] = useState(false);
  const [autoProvision, setAutoProvision] = useState(false);
  const [defaultRole, setDefaultRole] = useState('member');

  // Domain form state
  const [newDomain, setNewDomain] = useState('');

  // Events filter state
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [eventsPage, setEventsPage] = useState(1);

  // Feedback state
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  const { data: ssoConfig, isLoading: configLoading } = useQuery({
    queryKey: ['sso-config', orgId],
    queryFn: () => apiService.get<{ config: SamlConfig }>(`/api/organizations/${orgId}/sso`),
    enabled: !!orgId,
    retry: false,
  });

  // Populate form when config loads
  React.useEffect(() => {
    const cfg = ssoConfig?.data?.config;
    if (cfg) {
      setIdpSsoUrl(cfg.idpSsoUrl || '');
      setIdpCertificate(cfg.idpCertificate || '');
      setEntityId(cfg.entityId || '');
      setEmailAttr(cfg.attributeMapping?.email || '');
      setFirstNameAttr(cfg.attributeMapping?.firstName || '');
      setLastNameAttr(cfg.attributeMapping?.lastName || '');
      setSignRequests(cfg.wantAssertionsSigned ?? false);
      setAutoProvision(cfg.autoProvision ?? false);
      setDefaultRole(cfg.defaultRole || 'member');
    }
  }, [ssoConfig]);

  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['sso-domains', orgId],
    queryFn: () => apiService.get<{ domains: Domain[] }>(`/api/organizations/${orgId}/sso/domains`),
    enabled: !!orgId && activeTab === 'domains',
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['sso-events', orgId, eventsPage, eventTypeFilter],
    queryFn: () => {
      const params: Record<string, string> = { page: String(eventsPage), limit: '20' };
      if (eventTypeFilter !== 'all') params.eventType = eventTypeFilter;
      return apiService.get<{ events: SsoEvent[]; pagination: { page: number; limit: number; total: number } }>(
        `/api/organizations/${orgId}/sso/events`,
        { params },
      );
    },
    enabled: !!orgId && activeTab === 'events',
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = buildApiUrl(`/api/organizations/${orgId}/sso`);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          idpSsoUrl,
          entityId,
          idpCertificate: idpCertificate || undefined,
          attributeMapping: {
            email: emailAttr || undefined,
            firstName: firstNameAttr || undefined,
            lastName: lastNameAttr || undefined,
          },
          wantAssertionsSigned: signRequests,
          autoProvision,
          defaultRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save configuration');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-config', orgId] });
      setSaveMessage({ type: 'success', text: 'SSO configuration saved successfully.' });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (err: Error) => {
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 4000);
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const url = buildApiUrl(`/api/organizations/${orgId}/sso/domains`);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add domain');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-domains', orgId] });
      setNewDomain('');
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const url = buildApiUrl(`/api/organizations/${orgId}/sso/domains/${domainId}/verify`);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Verification failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-domains', orgId] });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return apiService.delete(`/api/organizations/${orgId}/sso/domains/${domainId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-domains', orgId] });
    },
  });

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSaveConfig = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      saveMutation.mutate();
    },
    [saveMutation],
  );

  const handleDownloadMetadata = useCallback(async () => {
    try {
      const url = buildApiUrl(`/api/organizations/${orgId}/sso/metadata`);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'sp-metadata.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to download SP metadata.' });
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [orgId]);

  const handleAddDomain = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newDomain.trim()) {
        addDomainMutation.mutate(newDomain.trim());
      }
    },
    [newDomain, addDomainMutation],
  );

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  // ---------------------------------------------------------------------------
  // GUARD
  // ---------------------------------------------------------------------------

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Organization Required</h2>
          <p className="text-gray-400 text-sm">
            SSO settings require an organization. Please create or join an organization first.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const domains = domainsData?.data?.domains ?? [];
  const events = eventsData?.data?.events ?? [];
  const eventsPagination = eventsData?.data?.pagination;
  const totalPages = eventsPagination ? Math.ceil(eventsPagination.total / eventsPagination.limit) : 1;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold">SSO Settings</h1>
          </div>
          <p className="text-gray-400">
            Configure SAML single sign-on, manage verified domains, and review SSO events.
          </p>
        </div>

        {/* Save feedback */}
        {saveMessage && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${
              saveMessage.type === 'success'
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : 'bg-red-900/30 border border-red-700 text-red-400'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {saveMessage.text}
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 mb-8 border-b border-gray-700 pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'saml' && (
          <SamlTab
            configLoading={configLoading}
            idpSsoUrl={idpSsoUrl}
            setIdpSsoUrl={setIdpSsoUrl}
            idpCertificate={idpCertificate}
            setIdpCertificate={setIdpCertificate}
            entityId={entityId}
            setEntityId={setEntityId}
            emailAttr={emailAttr}
            setEmailAttr={setEmailAttr}
            firstNameAttr={firstNameAttr}
            setFirstNameAttr={setFirstNameAttr}
            lastNameAttr={lastNameAttr}
            setLastNameAttr={setLastNameAttr}
            signRequests={signRequests}
            setSignRequests={setSignRequests}
            autoProvision={autoProvision}
            setAutoProvision={setAutoProvision}
            defaultRole={defaultRole}
            setDefaultRole={setDefaultRole}
            onSave={handleSaveConfig}
            saving={saveMutation.isPending}
            onDownloadMetadata={handleDownloadMetadata}
          />
        )}

        {activeTab === 'domains' && (
          <DomainsTab
            domains={domains}
            loading={domainsLoading}
            newDomain={newDomain}
            setNewDomain={setNewDomain}
            onAddDomain={handleAddDomain}
            addingDomain={addDomainMutation.isPending}
            onVerify={(id) => verifyDomainMutation.mutate(id)}
            verifyingId={verifyDomainMutation.isPending ? (verifyDomainMutation.variables as string) : null}
            onDelete={(id) => deleteDomainMutation.mutate(id)}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab
            events={events}
            loading={eventsLoading}
            page={eventsPage}
            totalPages={totalPages}
            onPageChange={setEventsPage}
            eventTypeFilter={eventTypeFilter}
            onFilterChange={setEventTypeFilter}
            formatTimestamp={formatTimestamp}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: SAML Configuration
// ============================================================================

interface SamlTabProps {
  configLoading: boolean;
  idpSsoUrl: string;
  setIdpSsoUrl: (v: string) => void;
  idpCertificate: string;
  setIdpCertificate: (v: string) => void;
  entityId: string;
  setEntityId: (v: string) => void;
  emailAttr: string;
  setEmailAttr: (v: string) => void;
  firstNameAttr: string;
  setFirstNameAttr: (v: string) => void;
  lastNameAttr: string;
  setLastNameAttr: (v: string) => void;
  signRequests: boolean;
  setSignRequests: (v: boolean) => void;
  autoProvision: boolean;
  setAutoProvision: (v: boolean) => void;
  defaultRole: string;
  setDefaultRole: (v: string) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  onDownloadMetadata: () => void;
}

function SamlTab({
  configLoading,
  idpSsoUrl,
  setIdpSsoUrl,
  idpCertificate,
  setIdpCertificate,
  entityId,
  setEntityId,
  emailAttr,
  setEmailAttr,
  firstNameAttr,
  setFirstNameAttr,
  lastNameAttr,
  setLastNameAttr,
  signRequests,
  setSignRequests,
  autoProvision,
  setAutoProvision,
  defaultRole,
  setDefaultRole,
  onSave,
  saving,
  onDownloadMetadata,
}: SamlTabProps) {
  if (configLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* IdP Settings Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Identity Provider Settings</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="idp-sso-url" className="text-sm font-medium text-gray-300 mb-1 block">
              IdP SSO URL
            </Label>
            <Input
              id="idp-sso-url"
              type="url"
              placeholder="https://idp.example.com/sso/saml"
              value={idpSsoUrl}
              onChange={(e) => setIdpSsoUrl(e.target.value)}
              required
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <Label htmlFor="idp-cert" className="text-sm font-medium text-gray-300 mb-1 block">
              IdP Certificate
            </Label>
            <textarea
              id="idp-cert"
              rows={6}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={idpCertificate}
              onChange={(e) => setIdpCertificate(e.target.value)}
              className="w-full rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <Label htmlFor="entity-id" className="text-sm font-medium text-gray-300 mb-1 block">
              Entity ID
            </Label>
            <Input
              id="entity-id"
              type="text"
              placeholder="urn:fluxstudio:sp"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              required
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Attribute Mapping Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Attribute Mapping</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="attr-email" className="text-sm font-medium text-gray-300 mb-1 block">
              Email Attribute
            </Label>
            <Input
              id="attr-email"
              type="text"
              placeholder="email"
              value={emailAttr}
              onChange={(e) => setEmailAttr(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="attr-firstname" className="text-sm font-medium text-gray-300 mb-1 block">
              First Name Attribute
            </Label>
            <Input
              id="attr-firstname"
              type="text"
              placeholder="firstName"
              value={firstNameAttr}
              onChange={(e) => setFirstNameAttr(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="attr-lastname" className="text-sm font-medium text-gray-300 mb-1 block">
              Last Name Attribute
            </Label>
            <Input
              id="attr-lastname"
              type="text"
              placeholder="lastName"
              value={lastNameAttr}
              onChange={(e) => setLastNameAttr(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Options Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Options</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={signRequests}
              onChange={(e) => setSignRequests(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-300">Sign Authentication Requests</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoProvision}
              onChange={(e) => setAutoProvision(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-300">Auto-Provision New Users</span>
          </label>

          <div>
            <Label htmlFor="default-role" className="text-sm font-medium text-gray-300 mb-1 block">
              Default Role for Provisioned Users
            </Label>
            <select
              id="default-role"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="w-full max-w-xs rounded-lg bg-gray-900 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={saving}>
          Save Configuration
        </Button>
        <Button type="button" variant="outline" onClick={onDownloadMetadata} icon={<Download className="w-4 h-4" />}>
          Download SP Metadata
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// TAB: Domain Verification
// ============================================================================

interface DomainsTabProps {
  domains: Domain[];
  loading: boolean;
  newDomain: string;
  setNewDomain: (v: string) => void;
  onAddDomain: (e: React.FormEvent) => void;
  addingDomain: boolean;
  onVerify: (id: string) => void;
  verifyingId: string | null;
  onDelete: (id: string) => void;
}

function DomainsTab({
  domains,
  loading,
  newDomain,
  setNewDomain,
  onAddDomain,
  addingDomain,
  onVerify,
  verifyingId,
  onDelete,
}: DomainsTabProps) {
  return (
    <div className="space-y-6">
      {/* Add Domain Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Add Domain</h3>
        <form onSubmit={onAddDomain} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="new-domain" className="text-sm font-medium text-gray-300 mb-1 block">
              Domain Name
            </Label>
            <Input
              id="new-domain"
              type="text"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500"
            />
          </div>
          <Button type="submit" variant="primary" loading={addingDomain} icon={<Plus className="w-4 h-4" />}>
            Add Domain
          </Button>
        </form>
      </div>

      {/* Domains Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Verified Domains</h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No domains added yet. Add a domain above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-6 py-3 font-medium text-gray-400">Domain</th>
                  <th className="px-6 py-3 font-medium text-gray-400">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-400">DNS Record</th>
                  <th className="px-6 py-3 font-medium text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {domains.map((d) => {
                  const token = d.verificationToken || d.verification_token || '';
                  return (
                    <tr key={d.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 font-medium text-white">{d.domain}</td>
                      <td className="px-6 py-4">
                        {d.status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400 border border-green-700">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-700">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {d.status === 'pending' && token ? (
                          <code className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-300 break-all">
                            TXT _fluxstudio.{d.domain} &rarr; fluxstudio-verification={token}
                          </code>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {d.status === 'pending' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={verifyingId === d.id}
                              onClick={() => onVerify(d.id)}
                              icon={<RefreshCw className="w-3.5 h-3.5" />}
                            >
                              Verify Now
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(d.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: SSO Events
// ============================================================================

interface EventsTabProps {
  events: SsoEvent[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  eventTypeFilter: string;
  onFilterChange: (f: string) => void;
  formatTimestamp: (ts: string) => string;
}

function EventsTab({
  events,
  loading,
  page,
  totalPages,
  onPageChange,
  eventTypeFilter,
  onFilterChange,
  formatTimestamp,
}: EventsTabProps) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
        <Label htmlFor="event-filter" className="text-sm font-medium text-gray-300 whitespace-nowrap">
          Event Type
        </Label>
        <select
          id="event-filter"
          value={eventTypeFilter}
          onChange={(e) => {
            onFilterChange(e.target.value);
            onPageChange(1);
          }}
          className="rounded-lg bg-gray-900 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Events</option>
          <option value="login_success">Login Success</option>
          <option value="login_failed">Login Failed</option>
          <option value="logout">Logout</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Event Log</h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No SSO events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-6 py-3 font-medium text-gray-400">Event Type</th>
                  <th className="px-6 py-3 font-medium text-gray-400">User Email</th>
                  <th className="px-6 py-3 font-medium text-gray-400">IP Address</th>
                  <th className="px-6 py-3 font-medium text-gray-400">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-750">
                    <td className="px-6 py-3">
                      <EventTypeBadge type={ev.event_type} />
                    </td>
                    <td className="px-6 py-3 text-gray-300">{ev.user_email || '-'}</td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{ev.ip_address || '-'}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{formatTimestamp(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Event Type Badge
// ============================================================================

function EventTypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'login_success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-400">
          <Check className="w-3 h-3" /> Login Success
        </span>
      );
    case 'login_failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-400">
          <X className="w-3 h-3" /> Login Failed
        </span>
      );
    case 'logout':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
          Logout
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
          {type}
        </span>
      );
  }
}

export default SSOSettings;
