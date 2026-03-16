import type { Song, Section, CollaborationStatus } from '../../contexts/metmap/types';
import type { MetMapPresence } from '../../services/metmapCollaboration';
import type { MetMapBranch } from '../../hooks/metmap/useMetMapBranches';
import type { MetMapSnapshot } from '../../hooks/collaboration/useMetMapSnapshots';
import { TapTempo } from '../../components/metmap/TapTempo';
import { ExportImport } from '../../components/metmap/ExportImport';
import { ShortcutsHelp } from '../../hooks/metmap/useMetMapKeyboardShortcuts';
import { PresenceAvatars } from '../../components/metmap/PresenceAvatars';
import { BranchSwitcher } from '../../components/metmap/BranchSwitcher';
import { Drawer, DrawerContent } from '../../components/ui/drawer';

interface MetMapSongHeaderProps {
  isMobile: boolean;
  currentSong: Song;
  editedSections: Section[];
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showShortcutsHelp: boolean;
  showAIPanel: boolean;
  showBranchDrawer: boolean;
  showSnapshotDrawer: boolean;
  isCollabActive: boolean;
  collabStatus: CollaborationStatus;
  collabPeerCount: number;
  collabPeers: MetMapPresence[];
  userId: string;
  projectId: string | null | undefined;
  token: string | null | undefined;

  // Branch props
  branches: MetMapBranch[];
  snapshots: MetMapSnapshot[];
  activeBranchId: string | null;
  isBranchCreating: boolean;
  isBranchMerging: boolean;

  // Callbacks
  onUpdateSongTitle: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDeleteSong: () => void;
  onTapTempo: (bpm: number) => void;
  onImportSong: (data: Partial<Song> & { sections?: Partial<Section>[] }) => void;
  onAssetCreated: (asset: { id: string; name: string }) => void;
  onShareToChat: (asset: { id: string; name: string }) => void;
  setShowShortcutsHelp: (v: boolean) => void;
  setShowAIPanel: (v: boolean) => void;
  setShowBranchDrawer: (v: boolean) => void;
  setShowSnapshotDrawer: (v: boolean) => void;
  setActiveBranchId: (v: string | null) => void;
  createBranchMutation: (data: { name: string; description?: string; sourceSnapshotId?: string }) => Promise<unknown>;
  deleteBranchMutation: (branchId: string) => Promise<unknown>;
  mergeBranchMutation: (branchId: string) => Promise<unknown>;
}

export function MetMapSongHeader({
  isMobile,
  currentSong,
  editedSections,
  hasUnsavedChanges,
  canUndo,
  canRedo,
  showShortcutsHelp,
  showAIPanel,
  showBranchDrawer,
  isCollabActive,
  collabStatus,
  collabPeerCount,
  collabPeers,
  userId,
  projectId,
  token,
  branches,
  snapshots,
  activeBranchId,
  isBranchCreating,
  isBranchMerging,
  onUpdateSongTitle,
  onUndo,
  onRedo,
  onSave,
  onDeleteSong,
  onTapTempo,
  onImportSong,
  onAssetCreated,
  onShareToChat,
  setShowShortcutsHelp,
  setShowAIPanel,
  setShowBranchDrawer,
  setShowSnapshotDrawer,
  setActiveBranchId,
  createBranchMutation,
  deleteBranchMutation,
  mergeBranchMutation,
}: MetMapSongHeaderProps) {
  return (
    <div className={`p-3 sm:p-4 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <input
            type="text"
            value={currentSong.title}
            onChange={(e) => onUpdateSongTitle(e.target.value)}
            className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1 -ml-1 w-full"
          />
          <div className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>{currentSong.bpmDefault} BPM</span>
            <span>{currentSong.timeSignatureDefault}</span>
            <span>{currentSong.totalBars} bars total</span>
            {currentSong.projectName && (
              <span className="text-indigo-600">Project: {currentSong.projectName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Collaboration status + presence */}
          {collabStatus !== 'disconnected' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-200" title={`Collaboration: ${collabStatus}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  collabStatus === 'synced' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                }`} />
                <span className="text-[10px] text-neutral-600">
                  {collabPeerCount <= 1 ? 'Solo' : `${collabPeerCount} editing`}
                </span>
              </div>
              {collabPeers.length > 1 && (
                <PresenceAvatars
                  peers={collabPeers}
                  currentUserId={userId}
                />
              )}
            </div>
          )}
          {/* Branch switcher (Sprint 33) */}
          {isMobile ? (
            <>
              <button
                onClick={() => setShowBranchDrawer(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Branches"
                title="Branches"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <Drawer direction="bottom" open={showBranchDrawer} onOpenChange={setShowBranchDrawer}>
                <DrawerContent className="max-h-[80vh] p-4">
                  <BranchSwitcher
                    branches={branches}
                    snapshots={snapshots}
                    activeBranchId={activeBranchId}
                    currentUserId={userId}
                    onSwitchBranch={setActiveBranchId}
                    onCreateBranch={createBranchMutation}
                    onDeleteBranch={deleteBranchMutation}
                    onMergeBranch={mergeBranchMutation}
                    isCreating={isBranchCreating}
                    isMerging={isBranchMerging}
                  />
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            <BranchSwitcher
              branches={branches}
              snapshots={snapshots}
              activeBranchId={activeBranchId}
              currentUserId={userId}
              onSwitchBranch={setActiveBranchId}
              onCreateBranch={createBranchMutation}
              onDeleteBranch={deleteBranchMutation}
              onMergeBranch={mergeBranchMutation}
              isCreating={isBranchCreating}
              isMerging={isBranchMerging}
            />
          )}
          {/* Snapshot drawer trigger (mobile only) */}
          {isMobile && isCollabActive && (
            <button
              onClick={() => setShowSnapshotDrawer(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Snapshots"
              title="Snapshots"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500">Unsaved changes</span>
          )}
          <TapTempo onTempoDetected={onTapTempo} />
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button
            onClick={onSave}
            disabled={!hasUnsavedChanges}
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMobile ? 'Save' : 'Save Timeline'}
          </button>
          <ExportImport
            currentSong={currentSong}
            sections={editedSections}
            onImportSong={onImportSong}
            projectId={projectId ?? undefined}
            token={token ?? undefined}
            onAssetCreated={onAssetCreated}
            onShareToChat={onShareToChat}
          />
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`p-1.5 transition-colors ${
              showAIPanel ? 'text-violet-600 bg-violet-50 rounded' : 'text-gray-400 hover:text-violet-600'
            }`}
            aria-label="AI Co-Pilot"
            title="AI Co-Pilot"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          <button
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <button
            onClick={onDeleteSong}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Delete song"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {showShortcutsHelp && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <ShortcutsHelp />
        </div>
      )}
    </div>
  );
}
