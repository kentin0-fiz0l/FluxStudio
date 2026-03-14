/**
 * ShareDialog - Generate and copy shareable links for formations
 *
 * Provides tabbed interface for generating share URLs with role-based
 * filtering (full view, individual performer, section leader, embed).
 * Works with the SharedFormation page's URL param conventions.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Share2, Copy, Check, Users, Code2, X, Link, Music } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';

// ============================================================================
// TYPES
// ============================================================================

interface Performer {
  id: string;
  name: string;
  label: string;
}

interface ShareDialogProps {
  formationId: string;
  performers: Performer[];
  sections: string[];
  isOpen: boolean;
  onClose: () => void;
}

type ShareTab = 'full' | 'performers' | 'sections' | 'embed';

interface TabConfig {
  id: ShareTab;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: TabConfig[] = [
  { id: 'full', label: 'Full View', icon: <Link className="w-4 h-4" aria-hidden="true" /> },
  { id: 'performers', label: 'Performers', icon: <Users className="w-4 h-4" aria-hidden="true" /> },
  { id: 'sections', label: 'Sections', icon: <Music className="w-4 h-4" aria-hidden="true" /> },
  { id: 'embed', label: 'Embed', icon: <Code2 className="w-4 h-4" aria-hidden="true" /> },
];

const COPY_RESET_DELAY = 2000;

// ============================================================================
// HOOKS
// ============================================================================

function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), COPY_RESET_DELAY);
      eventTracker.trackEvent('share_link_copied', { method: key });
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), COPY_RESET_DELAY);
      eventTracker.trackEvent('share_link_copied', { method: key });
      return true;
    }
  }, []);

  return { copiedKey, copyText };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CopyButton({
  text,
  copyKey,
  copiedKey,
  onCopy,
  label = 'Copy',
  className = '',
}: {
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
  label?: string;
  className?: string;
}) {
  const isCopied = copiedKey === copyKey;

  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isCopied
          ? 'bg-green-500 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${className}`}
      aria-label={isCopied ? 'Copied' : label}
    >
      {isCopied ? (
        <>
          <Check className="w-4 h-4" aria-hidden="true" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}

function UrlDisplay({
  url,
  copyKey,
  copiedKey,
  onCopy,
}: {
  url: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300 truncate select-all">
        {url}
      </div>
      <CopyButton
        text={url}
        copyKey={copyKey}
        copiedKey={copiedKey}
        onCopy={onCopy}
        label="Copy"
      />
    </div>
  );
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

function FullViewTab({
  baseUrl,
  copiedKey,
  onCopy,
}: {
  baseUrl: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Share the full formation view. Anyone with this link can view the
        formation, playback, and all performers.
      </p>
      <UrlDisplay
        url={baseUrl}
        copyKey="full-view"
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
    </div>
  );
}

function PerformersTab({
  baseUrl,
  performers,
  copiedKey,
  onCopy,
  onTrackShare,
}: {
  baseUrl: string;
  performers: Performer[];
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
  onTrackShare: (type: string, detail: string) => void;
}) {
  const getPerformerUrl = useCallback(
    (performer: Performer) =>
      `${baseUrl}?role=performer&performerId=${encodeURIComponent(performer.id)}`,
    [baseUrl],
  );

  const allPerformerLinks = useMemo(
    () =>
      performers
        .map(
          (p) =>
            `${p.name} (${p.label}): ${getPerformerUrl(p)}`,
        )
        .join('\n'),
    [performers, getPerformerUrl],
  );

  const handleCopyPerformer = useCallback(
    async (performer: Performer) => {
      const url = getPerformerUrl(performer);
      await onCopy(url, `performer-${performer.id}`);
      onTrackShare('performer', performer.id);
    },
    [getPerformerUrl, onCopy, onTrackShare],
  );

  const handleCopyAll = useCallback(async (text: string, key: string) => {
    const result = await onCopy(text, key);
    onTrackShare('all_performers', `${performers.length} performers`);
    return result;
  }, [onCopy, onTrackShare, performers.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generate individual share links with coordinate sheet views for each
          performer.
        </p>
        {performers.length > 1 && (
          <CopyButton
            text={allPerformerLinks}
            copyKey="all-performers"
            copiedKey={copiedKey}
            onCopy={handleCopyAll}
            label="Copy All Links"
            className="flex-shrink-0"
          />
        )}
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-lg divide-y divide-gray-100 dark:divide-neutral-700">
        {performers.map((performer) => {
          const isCopied = copiedKey === `performer-${performer.id}`;

          return (
            <button
              key={performer.id}
              onClick={() => handleCopyPerformer(performer)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold flex-shrink-0">
                  {performer.label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {performer.name}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ${
                  isCopied
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy link
                  </>
                )}
              </span>
            </button>
          );
        })}

        {performers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No performers in this formation.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionsTab({
  baseUrl,
  sections,
  copiedKey,
  onCopy,
  onTrackShare,
}: {
  baseUrl: string;
  sections: string[];
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
  onTrackShare: (type: string, detail: string) => void;
}) {
  const getSectionUrl = useCallback(
    (section: string) =>
      `${baseUrl}?role=section-leader&section=${encodeURIComponent(section)}`,
    [baseUrl],
  );

  const handleCopySection = useCallback(
    async (section: string) => {
      const url = getSectionUrl(section);
      await onCopy(url, `section-${section}`);
      onTrackShare('section', section);
    },
    [getSectionUrl, onCopy, onTrackShare],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Generate section-specific links for section leaders. Each link filters
        the formation to show only that section's performers.
      </p>

      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-lg divide-y divide-gray-100 dark:divide-neutral-700">
        {sections.map((section) => {
          const isCopied = copiedKey === `section-${section}`;

          return (
            <button
              key={section}
              onClick={() => handleCopySection(section)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Music className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {section}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ${
                  isCopied
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy link
                  </>
                )}
              </span>
            </button>
          );
        })}

        {sections.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No sections defined for this formation.
          </div>
        )}
      </div>
    </div>
  );
}

function EmbedTab({
  formationId,
  copiedKey,
  onCopy,
}: {
  formationId: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => Promise<boolean>;
}) {
  const embedSnippet = `<iframe src="https://fluxstudio.art/embed/${formationId}" width="600" height="400" frameborder="0" allow="autoplay"></iframe>`;

  const handleCopyEmbed = useCallback(async (text: string, key: string) => {
    const result = await onCopy(text, key);
    eventTracker.trackEvent('embed_code_copied', { formationId });
    return result;
  }, [onCopy, formationId]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Embed this formation on your website or LMS. Copy the HTML snippet below
        and paste it into your page.
      </p>

      <div className="relative">
        <pre className="px-4 py-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
          {embedSnippet}
        </pre>
      </div>

      <CopyButton
        text={embedSnippet}
        copyKey="embed-snippet"
        copiedKey={copiedKey}
        onCopy={handleCopyEmbed}
        label="Copy Embed Code"
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ShareDialog: React.FC<ShareDialogProps> = ({
  formationId,
  performers,
  sections,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ShareTab>('full');
  const { copiedKey, copyText } = useCopyToClipboard();

  const baseUrl = useMemo(
    () => `${window.location.origin}/share/${formationId}`,
    [formationId],
  );

  const handleTrackShare = useCallback(
    (type: string, detail: string) => {
      eventTracker.trackEvent('formation_share_link_copied', {
        formationId,
        shareType: type,
        detail,
      });
    },
    [formationId],
  );

  const handleCopy = useCallback(
    async (text: string, key: string) => {
      const result = await copyText(text, key);
      // Track full-view and embed copies directly
      if (key === 'full-view') {
        handleTrackShare('full_view', baseUrl);
      } else if (key === 'embed-snippet') {
        handleTrackShare('embed', baseUrl);
      }
      return result;
    },
    [copyText, handleTrackShare, baseUrl],
  );

  const handleTabChange = useCallback(
    (tab: ShareTab) => {
      setActiveTab(tab);
      eventTracker.trackEvent('formation_share_tab_changed', {
        formationId,
        tab,
      });
    },
    [formationId],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share Formation"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share Formation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-neutral-700 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'full' && (
            <FullViewTab
              baseUrl={baseUrl}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'performers' && (
            <PerformersTab
              baseUrl={baseUrl}
              performers={performers}
              copiedKey={copiedKey}
              onCopy={copyText}
              onTrackShare={handleTrackShare}
            />
          )}

          {activeTab === 'sections' && (
            <SectionsTab
              baseUrl={baseUrl}
              sections={sections}
              copiedKey={copiedKey}
              onCopy={copyText}
              onTrackShare={handleTrackShare}
            />
          )}

          {activeTab === 'embed' && (
            <EmbedTab
              formationId={formationId}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
