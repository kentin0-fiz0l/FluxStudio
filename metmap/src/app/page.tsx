'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Music, Calendar, Star, Search, MoreVertical } from 'lucide-react';
import { useMetMapStore, useSongsByLastPracticed } from '@/stores/useMetMapStore';
import { formatTime, getSongConfidence } from '@/types/metmap';
import { clsx } from 'clsx';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const songs = useSongsByLastPracticed();

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MetMap
          </h1>
          <button
            onClick={() => setShowNewSongModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium transition-colors tap-target"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Song</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500 focus:border-transparent"
          />
        </div>
      </header>

      {/* Song List */}
      <div className="flex-1 px-4 py-4">
        {filteredSongs.length === 0 ? (
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
      <div className="w-16 h-16 mb-4 rounded-full bg-metmap-100 dark:bg-metmap-900 flex items-center justify-center">
        <Music className="w-8 h-8 text-metmap-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No songs yet
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Add your first song to start mapping out sections and tracking your practice progress.
      </p>
      <button
        onClick={onAddSong}
        className="flex items-center gap-2 px-6 py-3 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium transition-colors"
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

  return (
    <Link
      href={`/song/${song.id}`}
      className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-metmap-300 dark:hover:border-metmap-600 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Confidence indicator */}
        <div
          className={clsx(
            'w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold',
            confidenceLevel === 1 && 'bg-red-500',
            confidenceLevel === 2 && 'bg-orange-500',
            confidenceLevel === 3 && 'bg-yellow-500',
            confidenceLevel === 4 && 'bg-lime-500',
            confidenceLevel === 5 && 'bg-green-500',
            confidence === 0 && 'bg-gray-400'
          )}
        >
          {confidence > 0 ? confidence.toFixed(1) : '-'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {song.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {song.artist}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
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
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Section preview bar */}
      {song.sections.length > 0 && song.duration > 0 && (
        <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {song.sections.map((section) => {
            const width = ((section.endTime - section.startTime) / song.duration) * 100;
            const left = (section.startTime / song.duration) * 100;
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
                style={{
                  width: `${width}%`,
                  marginLeft: section === song.sections[0] ? `${left}%` : undefined,
                }}
                title={`${section.name}: ${section.confidence}/5`}
              />
            );
          })}
        </div>
      )}
    </Link>
  );
}

function NewSongModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const addSong = useMetMapStore((state) => state.addSong);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    const song = addSong({ title: title.trim(), artist: artist.trim() });
    onClose();
    // Navigate to the new song
    window.location.href = `/song/${song.id}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add New Song
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Song Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Autumn Leaves"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="artist"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Artist / Composer
                </label>
                <input
                  id="artist"
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g., Joseph Kosma"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !artist.trim()}
              className="flex-1 px-4 py-2 bg-metmap-500 hover:bg-metmap-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
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
