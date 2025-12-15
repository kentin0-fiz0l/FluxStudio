/**
 * AICoPilotProvider - Global AI Co-Pilot integration
 *
 * Provides AI features throughout the app:
 * - Chat panel
 * - Command palette
 * - Suggestions bar
 * - Keyboard shortcuts
 */

import * as React from 'react';
import { AIChatPanel } from './AIChatPanel';
import { AICommandPalette } from './AICommandPalette';
import { AISuggestionsBar } from './AISuggestionsBar';
import { useAIShortcuts } from '@/hooks/useAIShortcuts';
import { useAIContext } from '@/hooks/useAIContext';
import { useAI } from '@/store/slices/aiSlice';

interface AICoPilotContextValue {
  isChatOpen: boolean;
  isCommandPaletteOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  context: ReturnType<typeof useAIContext>;
}

const AICoPilotContext = React.createContext<AICoPilotContextValue | null>(null);

export function useAICoPilot() {
  const context = React.useContext(AICoPilotContext);
  if (!context) {
    throw new Error('useAICoPilot must be used within AICoPilotProvider');
  }
  return context;
}

interface AICoPilotProviderProps {
  children: React.ReactNode;
  showSuggestions?: boolean;
  suggestionsPosition?: 'top' | 'bottom';
  chatPosition?: 'right' | 'bottom';
  enableShortcuts?: boolean;
}

export function AICoPilotProvider({
  children,
  showSuggestions = true,
  suggestionsPosition = 'bottom',
  chatPosition = 'right',
  enableShortcuts = true,
}: AICoPilotProviderProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const aiContext = useAIContext({ trackActions: true });
  const ai = useAI();

  const openChat = React.useCallback(() => setIsChatOpen(true), []);
  const closeChat = React.useCallback(() => setIsChatOpen(false), []);
  const toggleChat = React.useCallback(() => setIsChatOpen((prev) => !prev), []);

  const openCommandPalette = React.useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = React.useCallback(() => setIsCommandPaletteOpen(false), []);
  const toggleCommandPalette = React.useCallback(() => setIsCommandPaletteOpen((prev) => !prev), []);

  // Register keyboard shortcuts
  useAIShortcuts({
    enabled: enableShortcuts,
    handlers: {
      onOpenCommandPalette: openCommandPalette,
      onOpenChat: openChat,
      onGetSuggestion: () => {
        // Could trigger inline suggestion based on current context
        const summary = aiContext.getContextSummary();
        ai.addSuggestion({
          type: 'action',
          title: 'AI Suggestion Available',
          description: `Based on your current activity: ${summary.slice(0, 100)}...`,
          confidence: 0.8,
          context: {
            projectId: aiContext.context.activeProject?.id,
            entityType: aiContext.context.activeEntity?.type,
            entityId: aiContext.context.activeEntity?.id,
          },
          actions: [
            { label: 'View Details', action: 'open_chat', payload: { context: summary } },
          ],
        });
      },
    },
  });

  const value: AICoPilotContextValue = {
    isChatOpen,
    isCommandPaletteOpen,
    openChat,
    closeChat,
    toggleChat,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    context: aiContext,
  };

  return (
    <AICoPilotContext.Provider value={value}>
      {children}

      {/* AI Chat Panel */}
      <AIChatPanel
        isOpen={isChatOpen}
        onClose={closeChat}
        position={chatPosition}
      />

      {/* AI Command Palette */}
      <AICommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onOpenChat={openChat}
      />

      {/* AI Suggestions Bar */}
      {showSuggestions && !isChatOpen && (
        <AISuggestionsBar
          position={suggestionsPosition}
          onOpenChat={openChat}
        />
      )}
    </AICoPilotContext.Provider>
  );
}

export default AICoPilotProvider;
