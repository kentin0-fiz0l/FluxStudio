'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Music, Calendar, Search, MoreVertical, Settings } from 'lucide-react';
import { useMetMapStore, useSongsByLastPracticed } from '@/stores/useMetMapStore';
import { formatTime, getSongConfidence } from '@/types/metmap';
import { clsx } from 'clsx';
import { SyncButton } from '@/components/SyncButton';
import { useSession } from 'next-auth/react';
import { QuickMetronome } from '@/components/QuickMetronome';
import { MetMapLogo } from '@/components/MetMapLogo';

// Hook to detect when client-side hydration is complete
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const hasMounted = useHasMounted();
  const songs = useSongsByLastPracticed();

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MetMapLogo size="md" />
            <h1 className="text-2xl font-bold text-white flex items-center">
              <span className="text-hw-brass">Met</span>Map
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton compact />
            <Link
              href="/settings"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowNewSongModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active tap-target"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Song</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-hw-surface border border-hw-surface rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass focus:border-transparent transition-all"
          />
        </div>
      </header>

      {/* Quick Metronome */}
      <div className="px-4 pt-4">
        <QuickMetronome />
      </div>

      {/* Song List */}
      <div className="flex-1 px-4 py-4">
        {!hasMounted ? (
          // Loading skeleton while hydrating from localStorage
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-hw-surface rounded-xl shadow-pad animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-700" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSongs.length === 0 ? (
          <EmptyState onAddSong={() => setShowNewSongModal(true)} />
        ) : (
          <div className="space-y-3">
            {filteredSongs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </div>

      {/* New Song Modal */}
      {showNewSongModal && (
        <NewSongModal onClose={() => setShowNewSongModal(false)} />
      )}
    </main>
  );
}

function EmptyState({ onAddSong }: { onAddSong: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-hw-surface flex items-center justify-center shadow-pad">
        <Music className="w-8 h-8 text-hw-brass" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        No songs yet
      </h2>
      <p className="text-gray-400 mb-6 max-w-sm">
        Add your first song to start mapping out sections and tracking your practice progress.
      </p>
      <button
        onClick={onAddSong}
        className="flex items-center gap-2 px-6 py-3 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active"
      >
        <Plus className="w-5 h-5" />
        Add Your First Song
      </button>
    </div>
  );
}

function SongCard({ song }: { song: ReturnType<typeof useSongsByLastPracticed>[number] }) {
  const confidence = getSongConfidence(song);
  const confidenceLevel = Math.round(confidence) || 1;

  const getConfidenceColor = (level: number) => {
    if (confidence === 0) return 'bg-gray-600';
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-lime-500',
      5: 'bg-green-500',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-600';
  };

  return (
    <Link
      href={`/song/${song.id}`}
      className="block p-4 bg-hw-surface rounded-xl shadow-pad hover:shadow-pad-active border border-transparent hover:border-hw-brass/30 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Confidence indicator */}
        <div
          className={clsx(
            'w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-knob',
            getConfidenceColor(confidenceLevel)
          )}
        >
          {confidence > 0 ? confidence.toFixed(1) : '-'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {song.title}
          </h3>
          <p className="text-sm text-gray-400 truncate">
            {song.artist}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              {song.sections.length} sections
            </span>
            {song.duration > 0 && (
              <span>{formatTime(song.duration)}</span>
            )}
            {song.lastPracticed && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatRelativeDate(song.lastPracticed)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            // TODO: Show song menu
          }}
          className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-hw-charcoal transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Section preview bar - shows sections proportionally based on bar counts */}
      {song.sections.length > 0 && (() => {
        const totalBars = song.sections.reduce((sum, s) => sum + (s.bars || 8), 0);
        return (
          <div className="mt-3 h-2 bg-hw-charcoal rounded-full overflow-hidden flex">
            {song.sections.map((section) => {
              const width = ((section.bars || 8) / totalBars) * 100;
              return (
                <div
                  key={section.id}
                  className={clsx(
                    'h-full',
                    section.confidence === 1 && 'bg-red-500',
                    section.confidence === 2 && 'bg-orange-500',
                    section.confidence === 3 && 'bg-yellow-500',
                    section.confidence === 4 && 'bg-lime-500',
                    section.confidence === 5 && 'bg-green-500'
                  )}
                  style={{ width: `${width}%` }}
                  title={`${section.name}: ${section.bars || 8} bars, ${section.confidence}/5`}
                />
              );
            })}
          </div>
        );
      })()}
    </Link>
  );
}

function NewSongModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const addSong = useMetMapStore((state) => state.addSong);

  // Use the user's display name as the artist
  const artistName = session?.user?.name || 'Unknown Artist';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const song = addSong({ title: title.trim(), artist: artistName });
    onClose();
    // Navigate to the new song
    window.location.href = `/song/${song.id}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-hw-charcoal rounded-2xl shadow-xl overflow-hidden">
        {/* Brass accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-1">
              Add New Song
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Start tracking your practice progress
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5"
                >
                  Song Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Autumn Leaves, My New Piece"
                  className="w-full px-4 py-3 bg-hw-surface border border-hw-surface rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass transition-all"
                  autoFocus
                />
              </div>

              {/* Show who is creating the song */}
              <div className="flex items-center gap-3 p-3 bg-hw-surface/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-hw-brass flex items-center justify-center">
                  <span className="text-hw-charcoal font-bold text-sm">
                    {artistName[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                    Created by
                  </p>
                  <p className="text-white text-sm">{artistName}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-hw-surface">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-400 hover:bg-hw-surface rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-3 bg-hw-brass hover:bg-hw-brass/90 disabled:bg-gray-600 disabled:text-gray-400 text-hw-charcoal rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active disabled:cursor-not-allowed disabled:shadow-none"
            >
              Create Song
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
