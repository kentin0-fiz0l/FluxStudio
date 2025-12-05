'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Edit3,
  Save,
  Clock,
  Music,
  Settings,
  MoreVertical,
} from 'lucide-react';
import { useMetMapStore, useSongStats } from '@/stores/useMetMapStore';
import {
  Song,
  Section,
  SectionType,
  ConfidenceLevel,
  SECTION_COLORS,
  formatTime,
  parseTime,
} from '@/types/metmap';
import { clsx } from 'clsx';

export default function SongEditorPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const song = useMetMapStore((state) => state.getSong(songId));
  const updateSong = useMetMapStore((state) => state.updateSong);
  const deleteSong = useMetMapStore((state) => state.deleteSong);
  const addSection = useMetMapStore((state) => state.addSection);
  const updateSection = useMetMapStore((state) => state.updateSection);
  const deleteSection = useMetMapStore((state) => state.deleteSection);
  const stats = useSongStats(songId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (song) {
      setEditTitle(song.title);
      setEditArtist(song.artist);
      setEditDuration(song.duration > 0 ? formatTime(song.duration) : '');
    }
  }, [song]);

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Song not found</p>
          <Link
            href="/"
            className="text-metmap-500 hover:text-metmap-600 font-medium"
          >
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveDetails = () => {
    updateSong(songId, {
      title: editTitle.trim(),
      artist: editArtist.trim(),
      duration: parseTime(editDuration),
    });
    setIsEditing(false);
  };

  const handleDeleteSong = () => {
    if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
      deleteSong(songId);
      router.push('/');
    }
  };

  return (
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {isEditing ? (
            <div className="flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-b border-metmap-500 focus:outline-none"
                placeholder="Song title"
              />
              <input
                type="text"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
                className="w-full text-sm text-gray-500 bg-transparent border-b border-gray-300 focus:outline-none mt-1"
                placeholder="Artist"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {song.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {song.artist}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleSaveDetails}
                className="p-2 text-metmap-500 hover:bg-metmap-50 dark:hover:bg-metmap-900/20 rounded-lg"
              >
                <Save className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}

            <Link
              href={`/song/${songId}/practice`}
              className="flex items-center gap-2 px-4 py-2 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Practice
            </Link>
          </div>
        </div>
      </header>

      {/* Song Info */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <input
                type="text"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="3:45"
                className="w-16 bg-transparent border-b border-gray-300 focus:border-metmap-500 focus:outline-none"
              />
            </div>
          ) : song.duration > 0 ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(song.duration)}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            {song.sections.length} sections
          </div>

          {stats && stats.totalSessions > 0 && (
            <div className="flex items-center gap-2">
              {stats.totalSessions} practice sessions
            </div>
          )}
        </div>

        {/* Section Timeline */}
        {song.sections.length > 0 && song.duration > 0 && (
          <div className="mt-4">
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
              {song.sections.map((section) => {
                const width =
                  ((section.endTime - section.startTime) / song.duration) * 100;
                const left = (section.startTime / song.duration) * 100;
                return (
                  <div
                    key={section.id}
                    className="absolute h-full cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center text-xs text-white font-medium overflow-hidden"
                    style={{
                      width: `${width}%`,
                      left: `${left}%`,
                      backgroundColor: section.color || SECTION_COLORS[section.type],
                    }}
                    onClick={() => setEditingSectionId(section.id)}
                    title={`${section.name} (${formatTime(section.startTime)} - ${formatTime(section.endTime)})`}
                  >
                    {width > 10 && section.name}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0:00</span>
              <span>{formatTime(song.duration)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sections List */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sections
          </h2>
          <button
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-metmap-500 hover:bg-metmap-50 dark:hover:bg-metmap-900/20 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>

        {song.sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No sections yet. Add sections to map out different parts of the song.
            </p>
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-metmap-500 hover:bg-metmap-50 dark:hover:bg-metmap-900/20 rounded-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Add First Section
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {song.sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                songId={songId}
                isEditing={editingSectionId === section.id}
                onEdit={() => setEditingSectionId(section.id)}
                onClose={() => setEditingSectionId(null)}
                onDelete={() => {
                  if (confirm(`Delete "${section.name}"?`)) {
                    deleteSection(songId, section.id);
                  }
                }}
                onUpdate={(updates) => updateSection(songId, section.id, updates)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Song Button */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleDeleteSong}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Song
        </button>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          songId={songId}
          songDuration={song.duration}
          onClose={() => setShowAddSection(false)}
        />
      )}
    </main>
  );
}

function SectionCard({
  section,
  songId,
  isEditing,
  onEdit,
  onClose,
  onDelete,
  onUpdate,
}: {
  section: Section;
  songId: string;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Section>) => void;
}) {
  const [editName, setEditName] = useState(section.name);
  const [editStart, setEditStart] = useState(formatTime(section.startTime));
  const [editEnd, setEditEnd] = useState(formatTime(section.endTime));
  const [editType, setEditType] = useState(section.type);
  const [editNotes, setEditNotes] = useState(section.notes || '');

  const handleSave = () => {
    onUpdate({
      name: editName.trim(),
      startTime: parseTime(editStart),
      endTime: parseTime(editEnd),
      type: editType,
      notes: editNotes.trim() || undefined,
    });
    onClose();
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-metmap-500 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <input
              type="text"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              placeholder="0:00"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <input
              type="text"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              placeholder="0:30"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as SectionType)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
            >
              {Object.keys(SECTION_COLORS).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Any notes about this section..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-12 rounded-full"
        style={{ backgroundColor: section.color || SECTION_COLORS[section.type] }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {section.name}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
            {section.type}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatTime(section.startTime)} - {formatTime(section.endTime)}
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ confidence: level as ConfidenceLevel });
            }}
            className={clsx(
              'w-6 h-6 rounded-full text-xs font-medium transition-all',
              level <= section.confidence
                ? 'bg-metmap-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddSectionModal({
  songId,
  songDuration,
  onClose,
}: {
  songId: string;
  songDuration: number;
  onClose: () => void;
}) {
  const addSection = useMetMapStore((state) => state.addSection);
  const [name, setName] = useState('');
  const [type, setType] = useState<SectionType>('verse');
  const [startTime, setStartTime] = useState('0:00');
  const [endTime, setEndTime] = useState('0:30');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSection(songId, {
      name: name.trim(),
      type,
      startTime: parseTime(startTime),
      endTime: parseTime(endTime),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Section
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Verse 1, Chorus, Bridge"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Section Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SectionType)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                >
                  {Object.keys(SECTION_COLORS).map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="0:00"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="0:30"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  />
                </div>
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
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-metmap-500 hover:bg-metmap-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Add Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
