import type { Song, Section, MetMapStats } from '../../contexts/metmap/types';
import { NetworkStatusBadge } from '../../components/pwa/OfflineIndicator';
import { Drawer, DrawerContent } from '../../components/ui/drawer';
import { SongListItem, formatDuration } from './MetMapHelpers';

const quickStartSections: Section[] = [
  { id: crypto.randomUUID(), name: 'Intro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 0, startBar: 1 },
  { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 1, startBar: 5 },
  { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 2, startBar: 13 },
  { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 3, startBar: 21 },
  { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 4, startBar: 29 },
  { id: crypto.randomUUID(), name: 'Bridge', bars: 4, timeSignature: '4/4', tempoStart: 100, orderIndex: 5, startBar: 37 },
  { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 6, startBar: 41 },
  { id: crypto.randomUUID(), name: 'Outro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 7, startBar: 49 },
];

interface MetMapSongSidebarProps {
  isMobile: boolean;
  showSongList: boolean;
  setShowSongList: (v: boolean) => void;
  showNewSongModal: boolean;
  setShowNewSongModal: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  songs: Song[];
  songsLoading: boolean;
  stats: MetMapStats | null;
  currentSong: Song | null;
  createSong: (data: Partial<Song>) => Promise<Song | null>;
  onSelectSong: (song: Song) => void;
}

function SidebarContent({
  setShowNewSongModal,
  searchQuery,
  setSearchQuery,
  songs,
  songsLoading,
  stats,
  currentSong,
  createSong,
  onSelectSong,
}: Omit<MetMapSongSidebarProps, 'isMobile' | 'showSongList' | 'setShowSongList' | 'showNewSongModal'> & { setShowNewSongModal: (v: boolean) => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">MetMap</h2>
          <button
            onClick={() => setShowNewSongModal(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            aria-label="New song"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Rehearse tempo + meter changes and map chord progressions — great for complex pieces.
        </p>
        <a
          href="/projects"
          className="inline-block text-xs text-indigo-600 hover:text-indigo-700 mb-3"
        >
          Organize this work in a project →
        </a>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex gap-3">
          <span>{stats.songCount} songs</span>
          <span>{stats.practiceCount} sessions</span>
          <span>{formatDuration(stats.totalPracticeMinutes)} practiced</span>
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {songsLoading && songs.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
            <span className="text-sm">Loading songs...</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No songs yet</h3>
            <p className="text-xs text-gray-500 mb-4">
              Map out tempo changes, time signatures, and chord progressions for practice.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const quickStartSong: Partial<Song> = {
                    title: 'My Song',
                    projectId: undefined,
                    bpmDefault: 120,
                    timeSignatureDefault: '4/4',
                    sectionCount: quickStartSections.length,
                    totalBars: quickStartSections.reduce((sum, s) => sum + s.bars, 0),
                    practiceCount: 0,
                    sections: quickStartSections,
                  };
                  createSong(quickStartSong);
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Quick Start (with template)
              </button>
              <button
                onClick={() => setShowNewSongModal(true)}
                className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start from scratch
              </button>
            </div>
          </div>
        ) : (
          songs.map((song) => (
            <SongListItem
              key={song.id}
              song={song}
              isSelected={currentSong?.id === song.id}
              onClick={() => onSelectSong(song)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function MetMapSongSidebar(props: MetMapSongSidebarProps) {
  const {
    isMobile,
    showSongList,
    setShowSongList,
    setShowNewSongModal,
    currentSong,
    ...contentProps
  } = props;

  return (
    <>
      {/* Mobile header with sidebar toggle */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setShowSongList(!showSongList)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label={showSongList ? 'Hide song list' : 'Show song list'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-medium text-gray-900">
            {currentSong?.title || 'MetMap'}
          </div>
          <div className="flex items-center gap-2">
            <NetworkStatusBadge />
            <button
              onClick={() => setShowNewSongModal(true)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
              aria-label="New song"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Left sidebar - Song list */}
      {isMobile ? (
        <Drawer direction="left" open={showSongList} onOpenChange={setShowSongList}>
          <DrawerContent className="w-72 h-full">
            <SidebarContent
              setShowNewSongModal={setShowNewSongModal}
              currentSong={currentSong}
              {...contentProps}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
          <SidebarContent
            setShowNewSongModal={setShowNewSongModal}
            currentSong={currentSong}
            {...contentProps}
          />
        </div>
      )}
    </>
  );
}
