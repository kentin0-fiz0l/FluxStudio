import { forwardRef, lazy, Suspense, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { FloatingMessageButton } from './messaging/FloatingMessageButton';

// Lazy-load heavy components to keep dashboard chunk under 500 KB
const EnhancedHeader = lazy(() => import('./EnhancedHeader').then(m => ({ default: m.EnhancedHeader })));
const CommandPalette = lazy(() => import('./search/CommandPalette').then(m => ({ default: m.CommandPalette })));
const File = lazy(() => import('../pages/File').then(m => ({ default: m.File })));
const MessagingSidepanel = lazy(() => import('./messaging/MessagingSidepanel').then(m => ({ default: m.MessagingSidepanel })));

// ForwardRef wrapper for button elements to fix Slot ref warnings
const ForwardedButton = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
  <button {...props} ref={ref} />
));
ForwardedButton.displayName = "ForwardedButton";

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children: _children }: DashboardShellProps) {
  const { user } = useAuth();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [activeView, setActiveView] = useState('projects');
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const handleViewChange = (view: string) => {
    if (view === 'messages') {
      // Open messaging sidepanel instead of changing view
      setIsMessagingOpen(true);
    } else {
      setActiveView(view);
    }
  };

  // Keyboard shortcuts for messaging and navigation
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'm',
        metaKey: true,
        action: () => setIsMessagingOpen(!isMessagingOpen),
        description: 'Toggle messaging panel'
      },
      {
        key: 'Escape',
        action: () => {
          if (isMessagingOpen) setIsMessagingOpen(false);
          if (isCommandPaletteOpen) closeCommandPalette();
        },
        description: 'Close panels'
      },
      {
        key: '1',
        metaKey: true,
        action: () => setActiveView('organizations'),
        description: 'Go to Organizations'
      },
      {
        key: '2',
        metaKey: true,
        action: () => setActiveView('teams'),
        description: 'Go to Teams'
      },
      {
        key: '3',
        metaKey: true,
        action: () => setActiveView('projects'),
        description: 'Go to Projects'
      },
      {
        key: '4',
        metaKey: true,
        action: () => setActiveView('files'),
        description: 'Go to Files'
      }
    ]
  });

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <Suspense fallback={<div className="sticky top-0 z-50 w-full h-16 bg-neutral-900 border-b border-neutral-700/50" />}>
        <EnhancedHeader
          openCommandPalette={openCommandPalette}
          activeView={activeView}
          onViewChange={handleViewChange}
          onMessagingToggle={() => setIsMessagingOpen(true)}
        />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-xl animate-slideUp">
            {activeView === 'files' ? (
              <div className="w-full">
                <Suspense fallback={<div className="animate-pulse h-64 bg-neutral-100 dark:bg-neutral-800 rounded" />}>
                  <File />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                <p>Select a view from the navigation above.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Global Command Palette */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

      {/* Messaging Sidepanel - Available from any view */}
      <Suspense fallback={null}>
        <MessagingSidepanel
          isOpen={isMessagingOpen}
          onClose={() => setIsMessagingOpen(false)}
        />
      </Suspense>

      {/* Floating Message Button - Always visible for quick access */}
      <FloatingMessageButton
        onClick={() => setIsMessagingOpen(true)}
        isMessagingOpen={isMessagingOpen}
      />
    </div>
  );
}