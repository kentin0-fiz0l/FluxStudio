'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Music,
  Clock,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';
import { formatTime } from '@/types/metmap';
import { clsx } from 'clsx';

interface SharedSection {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  color?: string;
}

interface SharedSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm?: number;
  key?: string;
  timeSignature: string;
  tags: string[];
  createdAt: string;
  owner: {
    name: string;
    image?: string;
  };
  sections: SharedSection[];
  isOwner: boolean;
  canEdit: boolean;
  collaboratorRole: string | null;
}

export default function SharedSongPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token = params.token as string;

  const [song, setSong] = useState<SharedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSharedSong() {
      try {
        const response = await fetch(`/api/shared/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load shared song');
          return;
        }

        setSong(data);
      } catch {
        setError('Failed to load shared song');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchSharedSong();
    }
  }, [token]);

  const handleCopyToLibrary = async () => {
    if (!session?.user) {
      router.push(`/auth/login?callbackUrl=/shared/${token}`);
      return;
    }

    setCopying(true);
    try {
      const response = await fetch(`/api/shared/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy song');
      }

      setCopied(true);
      // Redirect to the copied song after a brief delay
      setTimeout(() => {
        router.push(`/song/${data.songId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy song');
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hw-charcoal flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-hw-brass animate-spin" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-hw-charcoal flex flex-col items-center justify-center p-4">
        <div className="bg-hw-surface rounded-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-hw-red mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            {error === 'Share link has expired'
              ? 'Link Expired'
              : error === 'Share link not found'
              ? 'Link Not Found'
              : 'Error'}
          </h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal rounded-lg font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-hw-brass mb-1">
              <Music className="w-4 h-4" />
              <span>Shared Song</span>
            </div>
            <h1 className="text-lg font-bold text-white truncate">{song.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Song Info Card */}
        <div className="bg-hw-surface rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg bg-hw-brass/20 flex items-center justify-center">
              <Music className="w-8 h-8 text-hw-brass" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{song.title}</h2>
              <p className="text-gray-400">{song.artist}</p>
              {song.album && <p className="text-sm text-gray-500">{song.album}</p>}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            {song.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(song.duration)}
              </span>
            )}
            {song.bpm && <span>{song.bpm} BPM</span>}
            {song.key && <span>Key: {song.key}</span>}
            <span>{song.timeSignature}</span>
          </div>

          {/* Owner Info */}
          <div className="flex items-center gap-2 pt-4 border-t border-hw-charcoal">
            <div className="w-8 h-8 rounded-full bg-hw-brass/20 flex items-center justify-center">
              {song.owner.image ? (
                <img
                  src={song.owner.image}
                  alt={song.owner.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-hw-brass" />
              )}
            </div>
            <span className="text-sm text-gray-400">
              Shared by <span className="text-white">{song.owner.name}</span>
            </span>
          </div>
        </div>

        {/* Sections */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Sections ({song.sections.length})
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            {song.sections.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                No sections defined
              </div>
            ) : (
              song.sections.map((section) => (
                <div key={section.id} className="flex items-center gap-4 p-4">
                  <div
                    className="w-3 h-10 rounded-full"
                    style={{
                      backgroundColor: section.color || getSectionColor(section.type),
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{section.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatTime(section.startTime)} - {formatTime(section.endTime)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 bg-hw-charcoal px-2 py-1 rounded">
                    {section.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section Timeline */}
        {song.sections.length > 0 && song.duration > 0 && (
          <section>
            <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
              Timeline
            </h2>
            <div className="bg-hw-surface rounded-xl p-4">
              <div className="h-8 bg-hw-charcoal rounded-lg overflow-hidden flex">
                {song.sections.map((section) => {
                  const width = ((section.endTime - section.startTime) / song.duration) * 100;
                  return (
                    <div
                      key={section.id}
                      className="h-full flex items-center justify-center text-xs font-medium text-white/80 overflow-hidden"
                      style={{
                        width: `${width}%`,
                        backgroundColor: section.color || getSectionColor(section.type),
                      }}
                      title={`${section.name}: ${formatTime(section.startTime)} - ${formatTime(section.endTime)}`}
                    >
                      {width > 10 && section.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {song.isOwner ? (
            <Link
              href={`/song/${song.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal font-medium rounded-lg transition-all shadow-pad"
            >
              Open in Library
            </Link>
          ) : (
            <button
              onClick={handleCopyToLibrary}
              disabled={copying || copied}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium rounded-lg transition-all shadow-pad',
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal'
              )}
            >
              {copying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy to My Library
                </>
              )}
            </button>
          )}
        </div>

        {/* Sign in prompt for guests */}
        {!session?.user && !song.isOwner && (
          <p className="text-center text-sm text-gray-400">
            <Link href={`/auth/login?callbackUrl=/shared/${token}`} className="text-hw-brass hover:underline">
              Sign in
            </Link>
            {' '}to copy this song to your library
          </p>
        )}
      </main>
    </div>
  );
}

function getSectionColor(type: string): string {
  const colors: Record<string, string> = {
    intro: '#06b6d4',
    verse: '#22c55e',
    'pre-chorus': '#84cc16',
    chorus: '#eab308',
    bridge: '#8b5cf6',
    solo: '#f97316',
    breakdown: '#ef4444',
    outro: '#64748b',
    custom: '#6b7280',
  };
  return colors[type] || colors.custom;
}
