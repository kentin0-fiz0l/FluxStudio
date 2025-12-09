'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Share2,
  Copy,
  Check,
  Loader2,
  X,
  Link as LinkIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMetMapStore, useSongStats } from '@/stores/useMetMapStore';
import {
  Section,
  SectionType,
  ConfidenceLevel,
  SECTION_COLORS,
  formatTime,
  parseTime,
} from '@/types/metmap';
import { ChordTimeline } from '@/components/ChordTimeline';
import { ChordSection, TimeSignature } from '@/types/song';
import { clsx } from 'clsx';

/**
 * Parse a time signature string like "4/4" into a TimeSignature object
 */
function parseTimeSignature(timeSig?: string): TimeSignature {
  if (!timeSig) return { numerator: 4, denominator: 4 };
  const parts = timeSig.split('/');
  if (parts.length === 2) {
    const num = parseInt(parts[0], 10);
    const denom = parseInt(parts[1], 10);
    if (!isNaN(num) && !isNaN(denom)) {
      return { numerator: num, denominator: denom };
    }
  }
  return { numerator: 4, denominator: 4 };
}

/**
 * Convert a Section to ChordSection format for the timeline
 */
function sectionToChordSection(section: Section, order: number): ChordSection {
  return {
    id: section.id,
    name: section.name,
    order,
    bars: section.bars || 8,
    chords: section.chords || [],
  };
}

export default function SongEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const songId = params.id as string;

  const song = useMetMapStore((state) => state.getSong(songId));
  const updateSong = useMetMapStore((state) => state.updateSong);
  const deleteSong = useMetMapStore((state) => state.deleteSong);
  const updateSection = useMetMapStore((state) => state.updateSection);
  const deleteSection = useMetMapStore((state) => state.deleteSection);
  const stats = useSongStats(songId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (song) {
      setEditTitle(song.title);
      setEditArtist(song.artist);
      setEditDuration(song.duration > 0 ? formatTime(song.duration) : '');
    }
  }, [song]);

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-hw-charcoal">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Song not found</p>
          <Link
            href="/"
            className="text-hw-brass hover:text-hw-peach font-medium"
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
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {isEditing ? (
            <div className="flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-b border-hw-brass focus:outline-none text-white"
                placeholder="Song title"
              />
              <input
                type="text"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
                className="w-full text-sm text-gray-400 bg-transparent border-b border-gray-600 focus:border-hw-brass focus:outline-none mt-1"
                placeholder="Artist"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">
                {song.title}
              </h1>
              <p className="text-sm text-gray-400 truncate">
                {song.artist}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleSaveDetails}
                className="p-2 text-hw-brass hover:bg-hw-surface rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}

            {session?.user && (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
                title="Share song"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}

            <Link
              href={`/song/${songId}/practice`}
              className="flex items-center gap-2 px-4 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active"
            >
              <Play className="w-4 h-4" />
              Practice
            </Link>
          </div>
        </div>
      </header>

      {/* Song Info */}
      <div className="px-4 py-4 border-b border-hw-surface">
        <div className="flex items-center gap-6 text-sm text-gray-400">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <input
                type="text"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="3:45"
                className="w-16 bg-transparent border-b border-gray-600 focus:border-hw-brass focus:outline-none text-white"
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

        {/* Section Timeline - shows sections proportionally based on bar counts */}
        {song.sections.length > 0 && (() => {
          const totalBars = song.sections.reduce((sum, s) => sum + (s.bars || 8), 0);
          return (
            <div className="mt-4">
              <div className="h-8 bg-hw-surface rounded-lg overflow-hidden relative shadow-pad flex">
                {song.sections.map((section) => {
                  const sectionBars = section.bars || 8;
                  const width = (sectionBars / totalBars) * 100;
                  return (
                    <div
                      key={section.id}
                      className="h-full cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center text-xs text-white font-medium overflow-hidden"
                      style={{
                        width: `${width}%`,
                        backgroundColor: section.color || SECTION_COLORS[section.type],
                      }}
                      onClick={() => setEditingSectionId(section.id)}
                      title={`${section.name} (${sectionBars} bars)`}
                    >
                      {width > 10 && section.name}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>{totalBars} bars</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Sections List */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Sections
          </h2>
          <button
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-hw-brass hover:bg-hw-surface rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>

        {song.sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              No sections yet. Add sections to map out different parts of the song.
            </p>
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-hw-brass hover:bg-hw-surface rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Section
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {song.sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                sectionIndex={index}
                timeSignature={parseTimeSignature(song.timeSignature)}
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
      <div className="px-4 py-4 border-t border-hw-surface">
        <button
          onClick={handleDeleteSong}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-hw-red hover:bg-hw-red/10 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Song
        </button>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          songId={songId}
          onClose={() => setShowAddSection(false)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          songId={songId}
          songTitle={song.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}

function SectionCard({
  section,
  sectionIndex,
  timeSignature,
  isEditing,
  onEdit,
  onClose,
  onDelete,
  onUpdate,
}: {
  section: Section;
  sectionIndex: number;
  timeSignature: TimeSignature;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Section>) => void;
}) {
  const [editName, setEditName] = useState(section.name);
  const [editBars, setEditBars] = useState(section.bars || 8);
  const [editType, setEditType] = useState(section.type);
  const [editNotes, setEditNotes] = useState(section.notes || '');
  const [showChords, setShowChords] = useState(false);

  const handleSave = () => {
    onUpdate({
      name: editName.trim(),
      bars: editBars,
      type: editType,
      notes: editNotes.trim() || undefined,
    });
    onClose();
  };

  // Handle chord timeline updates
  const handleChordChange = useCallback(
    (updatedChordSection: ChordSection) => {
      onUpdate({ chords: updatedChordSection.chords });
    },
    [onUpdate]
  );

  // Convert section to ChordSection format for the timeline
  const chordSection = sectionToChordSection(section, sectionIndex);
  const hasChords = section.chords && section.chords.length > 0;

  if (isEditing) {
    return (
      <div className="p-4 bg-hw-surface rounded-xl border-2 border-hw-brass shadow-pad space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-hw-brass text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as SectionType)}
              className="w-full px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-hw-brass text-white"
            >
              {Object.keys(SECTION_COLORS).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Bars</label>
            <input
              type="number"
              min="1"
              max="999"
              value={editBars}
              onChange={(e) => setEditBars(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-hw-brass text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Any notes about this section..."
              rows={2}
              className="w-full px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-hw-brass text-white resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-gray-400 hover:bg-hw-charcoal rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hw-surface rounded-xl shadow-pad border border-transparent hover:border-hw-brass/30 transition-all">
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
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
            <span className="font-medium text-white">
              {section.name}
            </span>
            <span className="text-xs px-2 py-0.5 bg-hw-charcoal rounded text-gray-400">
              {section.type}
            </span>
            {hasChords && (
              <span className="text-xs px-2 py-0.5 bg-hw-brass/20 rounded text-hw-brass">
                {section.chords!.length} chord{section.chords!.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {section.bars || 8} bars
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
                'w-6 h-6 rounded-full text-xs font-medium transition-all shadow-knob',
                level <= section.confidence
                  ? 'bg-hw-brass text-hw-charcoal'
                  : 'bg-hw-charcoal text-gray-500 hover:bg-gray-700'
              )}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Expand chords button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowChords(!showChords);
          }}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            showChords
              ? 'text-hw-brass bg-hw-brass/10'
              : 'text-gray-500 hover:text-white hover:bg-hw-charcoal'
          )}
          title={showChords ? 'Hide chords' : 'Show chords'}
        >
          {showChords ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-500 hover:text-hw-red rounded-lg hover:bg-hw-charcoal transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable chord timeline */}
      {showChords && (
        <div className="px-3 pb-3">
          <div className="border-t border-hw-charcoal pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">
                Chord Progression
              </span>
              <span className="text-xs text-gray-600">
                {timeSignature.numerator}/{timeSignature.denominator} time
              </span>
            </div>
            <div className="overflow-x-auto">
              <ChordTimeline
                section={chordSection}
                timeSignature={timeSignature}
                onChange={handleChordChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSectionModal({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const addSection = useMetMapStore((state) => state.addSection);
  const [name, setName] = useState('');
  const [type, setType] = useState<SectionType>('verse');
  const [bars, setBars] = useState(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSection(songId, {
      name: name.trim(),
      type,
      bars,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-hw-charcoal rounded-2xl shadow-xl overflow-hidden">
        {/* Brass accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-1">
              Add Section
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Map out a part of the song
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                  Section Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Verse 1, Chorus, Bridge"
                  className="w-full px-4 py-3 bg-hw-surface border border-hw-surface rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                    Section Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SectionType)}
                    className="w-full px-4 py-3 bg-hw-surface border border-hw-surface rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-hw-brass transition-all"
                  >
                    {Object.keys(SECTION_COLORS).map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                    Bars / Counts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={bars}
                    onChange={(e) => setBars(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 bg-hw-surface border border-hw-surface rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass transition-all"
                  />
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
              disabled={!name.trim()}
              className="flex-1 px-4 py-3 bg-hw-brass hover:bg-hw-brass/90 disabled:bg-gray-600 disabled:text-gray-400 text-hw-charcoal rounded-lg font-medium transition-all shadow-pad active:shadow-pad-active disabled:cursor-not-allowed disabled:shadow-none"
            >
              Add Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ShareLink {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
  url: string;
}

function ShareModal({
  songId,
  songTitle,
  onClose,
}: {
  songId: string;
  songTitle: string;
  onClose: () => void;
}) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<'never' | '1d' | '7d' | '30d'>('never');

  // Fetch existing share links
  useEffect(() => {
    async function fetchShareLinks() {
      try {
        const response = await fetch(`/api/songs/${songId}/share`);
        if (response.ok) {
          const data = await response.json();
          setShareLinks(data.shareLinks || []);
        }
      } catch {
        setError('Failed to load share links');
      } finally {
        setLoading(false);
      }
    }
    fetchShareLinks();
  }, [songId]);

  const handleCreateLink = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch(`/api/songs/${songId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: expiresIn === 'never' ? null : expiresIn }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setShareLinks((prev) => [data.shareLink, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/songs/${songId}/share/${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete share link');
      }

      setShareLinks((prev) => prev.filter((link) => link.id !== linkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete share link');
    }
  };

  const handleCopyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy link');
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires';
    const date = new Date(expiresAt);
    if (date < new Date()) return 'Expired';
    return `Expires ${date.toLocaleDateString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-hw-charcoal rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Brass accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Share Song</h2>
            <p className="text-sm text-gray-400 truncate">{songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 bg-hw-red/10 border border-hw-red/30 rounded-lg text-hw-red text-sm">
              {error}
            </div>
          )}

          {/* Create new link */}
          <div className="bg-hw-surface rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Create Share Link</h3>
            <p className="text-xs text-gray-400">
              Anyone with the link can view the song structure (sections, timing). Practice data stays private.
            </p>
            <div className="flex gap-2">
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
                className="flex-1 px-3 py-2 bg-hw-charcoal rounded-lg border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-hw-brass"
              >
                <option value="never">Never expires</option>
                <option value="1d">Expires in 1 day</option>
                <option value="7d">Expires in 7 days</option>
                <option value="30d">Expires in 30 days</option>
              </select>
              <button
                onClick={handleCreateLink}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </div>

          {/* Existing links */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
              Active Links ({shareLinks.length})
            </h3>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-hw-brass animate-spin" />
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No share links yet. Create one above.
              </div>
            ) : (
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-hw-surface rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-lg bg-hw-charcoal flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-hw-brass" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-mono truncate">
                        ...{link.token.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatExpiry(link.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(link)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors',
                          copiedId === link.id
                            ? 'text-green-500 bg-green-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-hw-charcoal'
                        )}
                        title="Copy link"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-white hover:bg-hw-charcoal rounded-lg transition-colors"
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-2 text-gray-400 hover:text-hw-red hover:bg-hw-charcoal rounded-lg transition-colors"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
