/**
 * Messages Page - Modern Mobile Chat Experience
 *
 * Thin shell component that composes extracted messaging components
 * and the useMessagesPageState hook for all state management.
 */

import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import {
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  WifiOff,
} from 'lucide-react';

/** Map raw API error messages to user-friendly text. */
function friendlyError(raw: string): string {
  if (/HTTP 5\d{2}|unexpected/i.test(raw))
    return 'Unable to reach the server. Please try again later.';
  if (/401|403|authentication|sign in|unauthorized/i.test(raw))
    return 'Session expired. Please sign in again.';
  if (/network|fetch|internet/i.test(raw))
    return 'No internet connection.';
  if (/timeout/i.test(raw))
    return 'The request timed out. Please try again.';
  if (/retrying/i.test(raw))
    return raw; // pass through retry status messages as-is
  return raw;
}
import {
  MessageComposer as MessageInput,
  EmptyMessagesState,
  PinnedMessagesPanel,
  NewConversationDialog,
  ForwardMessageDialog,
  ChatSidebar,
  ChatHeader,
  MessageListView,
  ConversationOptionsMenu,
} from '../components/messaging';
import { useMessagesPageState } from '../hooks/useMessagesPageState';

// Lazy-load conditionally rendered panels to reduce page-messages chunk size
const MessageSearchPanel = lazy(() =>
  import('../components/messaging/MessageSearchPanel').then(m => ({ default: m.MessageSearchPanel }))
);
const ThreadPanel = lazy(() =>
  import('../components/messaging/ThreadPanel').then(m => ({ default: m.ThreadPanel }))
);
const ConversationSummary = lazy(() =>
  import('../components/messaging/ConversationSummary').then(m => ({ default: m.ConversationSummary }))
);
const ConversationInfoPanel = lazy(() =>
  import('../components/messaging/ConversationInfoPanel').then(m => ({ default: m.ConversationInfoPanel }))
);

function MessagesNew() {
  const navigate = useNavigate();
  const state = useMessagesPageState();

  // Guard: If auth context indicates no user, return null
  if (!state.user) {
    return null;
  }

  const handleViewInFiles = (assetId: string) => {
    navigate(`/assets?highlight=${assetId}`);
  };

  return (
    <DashboardLayout
      user={state.user || undefined}
      breadcrumbs={[{ label: 'Messages' }]}
      onLogout={state.logout}
    >
      {/* Hidden file input */}
      <input
        ref={state.fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={state.handleFileSelect}
      />

      {/* Error Banner */}
      {state.conversationError && (
        <div className={`mx-4 mt-4 p-4 border rounded-lg ${
          state.isRetrying
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.isRetrying ? (
                <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" aria-hidden="true" />
              ) : /internet|network/i.test(friendlyError(state.conversationError)) ? (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  state.isRetrying
                    ? 'text-yellow-900 dark:text-yellow-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {state.isRetrying ? 'Reconnecting...' : 'Connection Error'}
                </p>
                <p className={`text-xs ${
                  state.isRetrying
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {friendlyError(state.conversationError)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!state.isRetrying && (
                <Button variant="ghost" size="sm" onClick={state.loadConversations}>
                  <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
                  Retry
                </Button>
              )}
              <button
                onClick={() => state.setConversationError(null)}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-800/50 rounded transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4 text-red-500 dark:text-red-400" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!state.realtime.isConnected && state.selectedConversationId && (
        <div className="mx-4 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Connecting to real-time messaging...
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex gap-0 md:gap-6 md:p-6">
        {/* Conversations Sidebar */}
        <ChatSidebar
          conversations={state.conversations}
          filteredConversations={state.filteredConversations}
          selectedConversation={state.selectedConversation}
          isLoading={state.isLoadingConversations}
          searchTerm={state.searchTerm}
          onSearchChange={state.setSearchTerm}
          filter={state.filter}
          onFilterChange={state.setFilter}
          onConversationClick={state.handleConversationClick}
          onNewConversation={() => state.setShowNewConversation(true)}
          onNavigateToProjects={() => navigate('/projects')}
          showMobileChat={state.showMobileChat}
          onlineCount={state.onlineCount}
          unreadCount={state.unreadCount}
          onMuteConversation={state.handleMuteConversation}
          onArchiveConversation={state.handleArchiveConversation}
        />

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!state.showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {state.selectedConversation ? (
            <>
              <ChatHeader
                conversation={state.selectedConversation}
                isTyping={state.realtime.typingUsers.some(t => t.userId === state.selectedConversation!.participant.id)}
                onBack={() => state.setShowMobileChat(false)}
                showMessageSearch={state.showMessageSearch}
                onToggleSearch={() => state.setShowMessageSearch(!state.showMessageSearch)}
                showPinnedMessages={state.showPinnedMessages}
                onTogglePinned={() => state.setShowPinnedMessages(!state.showPinnedMessages)}
                showSummary={state.isSummaryPanelOpen}
                onToggleSummary={() => state.setIsSummaryPanelOpen(!state.isSummaryPanelOpen)}
                onMoreOptions={() => state.setIsOptionsMenuOpen(!state.isOptionsMenuOpen)}
                moreOptionsSlot={
                  <ConversationOptionsMenu
                    conversation={state.selectedConversation}
                    open={state.isOptionsMenuOpen}
                    onOpenChange={state.setIsOptionsMenuOpen}
                    onMute={() => state.handleMuteConversation()}
                    onArchive={() => state.handleArchiveConversation()}
                    onViewInfo={() => {
                      state.setIsInfoPanelOpen(true);
                      state.setIsOptionsMenuOpen(false);
                    }}
                    onLeave={state.selectedConversation.type === 'group' ? state.handleLeaveConversation : undefined}
                    trigger={<span />}
                  />
                }
              />

              {state.showPinnedMessages && (
                <PinnedMessagesPanel
                  messages={state.pinnedMessages}
                  onClose={() => state.setShowPinnedMessages(false)}
                  onUnpin={(id) => state.handlePinMessage(id)}
                  onJumpTo={(id) => {
                    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
                    if (messageEl) {
                      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      messageEl.classList.add('ring-2', 'ring-primary-500');
                      setTimeout(() => messageEl.classList.remove('ring-2', 'ring-primary-500'), 2000);
                    }
                    state.setShowPinnedMessages(false);
                  }}
                />
              )}

              {state.showMessageSearch && (
                <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading search...</div>}>
                  <MessageSearchPanel
                    conversationId={state.selectedConversationId}
                    onResultClick={state.handleSearchResultClick}
                    onClose={() => state.setShowMessageSearch(false)}
                  />
                </Suspense>
              )}

              {state.showThreadHint && state.messages.length > 0 && (
                <div className="mx-4 mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-indigo-900 dark:text-indigo-100">
                        <span className="font-medium">Threads keep replies organized.</span>
                        {' '}Click the reply icon on any message to start a focused thread.
                      </p>
                    </div>
                    <button
                      onClick={state.dismissThreadHint}
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors flex-shrink-0"
                      aria-label="Dismiss hint"
                    >
                      <X className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              <MessageListView
                ref={state.messageListRef}
                messages={state.messages}
                messageById={state.messageById}
                currentUserId={state.user?.id}
                pinnedMessageIds={state.realtime.pinnedMessageIds}
                highlightedMessageId={state.highlightedMessageId}
                threadHighlightId={state.threadHighlightId}
                editingMessageId={state.editingMessageId}
                editingDraft={state.editingDraft}
                typingUserNames={state.realtime.typingUsers.map(u => u.userName || u.userEmail?.split('@')[0] || 'Someone')}
                onReply={state.handleReply}
                onEdit={state.handleStartEdit}
                onDelete={state.handleDeleteMessage}
                onPin={state.handlePinMessage}
                onCopy={state.handleCopyMessage}
                onJumpToMessage={state.handleJumpToMessage}
                onForward={state.handleStartForward}
                onReact={state.handleReact}
                onOpenThread={state.handleOpenThread}
                onViewInFiles={handleViewInFiles}
                onChangeEditingDraft={state.setEditingDraft}
                onSubmitEdit={state.handleSubmitEdit}
                onCancelEdit={state.handleCancelEdit}
              />

              <div ref={state.composerRef}>
                <MessageInput
                  value={state.newMessage}
                  onChange={state.handleInputChange}
                  onSend={state.handleSendMessage}
                  onAttach={state.handleAttach}
                  onFileDrop={state.handleFileDrop}
                  replyTo={state.replyTo}
                  onClearReply={() => state.setReplyTo(undefined)}
                  disabled={state.isSending || !state.realtime.isConnected}
                  pendingAttachments={state.pendingAttachments}
                  onRemoveAttachment={state.handleRemoveAttachment}
                  onSendVoice={state.handleSendVoice}
                />
              </div>
            </>
          ) : (
            <EmptyMessagesState onStartConversation={() => state.setShowNewConversation(true)} />
          )}
        </Card>

        {/* Thread Panel */}
        {state.isThreadPanelOpen && state.activeThreadRootId && state.selectedConversation && (
          <Suspense fallback={null}>
            <ThreadPanel
              conversationId={state.selectedConversation.id}
              rootMessage={{
                id: state.activeThreadRootId,
                userId: state.messages.find(m => m.id === state.activeThreadRootId)?.author.id || '',
                conversationId: state.selectedConversation.id,
                text: state.messages.find(m => m.id === state.activeThreadRootId)?.content || '',
                userName: state.messages.find(m => m.id === state.activeThreadRootId)?.author.name,
                createdAt: state.messages.find(m => m.id === state.activeThreadRootId)?.timestamp.toISOString() || new Date().toISOString(),
              }}
              messages={state.threadMessages.map(m => ({
                id: m.id,
                userId: m.author.id,
                conversationId: state.selectedConversation!.id,
                text: m.content,
                userName: m.author.name,
                createdAt: m.timestamp.toISOString(),
              }))}
              isLoading={state.isLoadingThread}
              onClose={state.handleCloseThread}
              onReply={state.handleThreadReply}
              currentUserId={state.user?.id}
            />
          </Suspense>
        )}

        {/* Summary Panel */}
        {state.isSummaryPanelOpen && state.selectedConversation && (
          <Suspense fallback={null}>
            <ConversationSummary
              conversationId={state.selectedConversation.id}
              projectId={state.selectedConversation.projectId}
              onClose={() => state.setIsSummaryPanelOpen(false)}
            />
          </Suspense>
        )}

        {/* Info Panel */}
        {state.isInfoPanelOpen && state.selectedConversation && (
          <Suspense fallback={null}>
            <ConversationInfoPanel
              conversation={state.selectedConversation}
              onClose={() => state.setIsInfoPanelOpen(false)}
              onMute={() => state.handleMuteConversation()}
              onArchive={() => state.handleArchiveConversation()}
            />
          </Suspense>
        )}
      </div>

      <NewConversationDialog
        open={state.showNewConversation}
        onOpenChange={(open) => {
          if (open) {
            state.setShowNewConversation(true);
          } else {
            state.resetNewConversationDialog();
          }
        }}
        selectedUsers={state.selectedUsers}
        onToggleUser={state.toggleUserSelection}
        searchTerm={state.userSearchTerm}
        onSearchChange={state.setUserSearchTerm}
        groupName={state.newConversationName}
        onGroupNameChange={state.setNewConversationName}
        availableUsers={state.availableUsers}
        isLoading={state.loadingUsers}
        onCreateConversation={state.handleCreateConversation}
      />

      <ForwardMessageDialog
        open={state.isForwardModalOpen}
        onOpenChange={state.setIsForwardModalOpen}
        sourceMessage={state.forwardSourceMessage}
        conversations={state.conversations}
        currentConversationId={state.selectedConversation?.id}
        targetConversationId={state.forwardTargetConversationId}
        onSelectTarget={state.setForwardTargetConversationId}
        onCancel={state.handleCancelForward}
        onConfirm={state.handleConfirmForward}
      />
    </DashboardLayout>
  );
}

export { MessagesNew };
export default MessagesNew;
