/**
 * MetMapSongSelector - UI for linking/unlinking a MetMap song to a formation
 *
 * Dropdown/modal listing MetMap songs with Link/Unlink actions.
 * Shows song title, BPM, section count, duration.
 * Visual badge in toolbar when linked.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Song } from '../../contexts/metmap/types';
import { buildApiUrl } from '../../config/environment';

interface MetMapSongSelectorProps {
  /** Currently linked song ID */
  linkedSongId?: string;
  /** Currently linked song data (if already loaded) */
  linkedSong?: Song | null;
  /** Callback when a song is linked */
  onLinkSong: (songId: string) => void;
  /** Callback when the song is unlinked */
  onUnlinkSong: () => void;
  /** Whether to use constant tempo override */
  useConstantTempo?: boolean;
  /** Toggle constant tempo override */
  onToggleConstantTempo?: (useConstant: boolean) => void;
}

export const MetMapSongSelector: React.FC<MetMapSongSelectorProps> = ({
  linkedSongId,
  linkedSong,
  onLinkSong,
  onUnlinkSong,
  useConstantTempo,
  onToggleConstantTempo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ limit: '50', orderBy: 'updated_at', orderDir: 'DESC' });
      if (search) params.set('search', search);

      const res = await fetch(buildApiUrl(`/metmap/songs?${params}`), {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load songs');
      const json = await res.json();
      setSongs(json.data?.songs ?? json.songs ?? []);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) loadSongs();
  }, [isOpen, loadSongs]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLinked = !!linkedSongId;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Toolbar button / badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          border: isLinked ? '1px solid #6366f1' : '1px solid #d1d5db',
          background: isLinked ? '#eef2ff' : '#fff',
          color: isLinked ? '#4338ca' : '#374151',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: isLinked ? 600 : 400,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 18V5l12-2v13" />
          <circle cx={6} cy={18} r={3} />
          <circle cx={18} cy={16} r={3} />
        </svg>
        {isLinked && linkedSong
          ? linkedSong.title
          : isLinked
          ? 'Song Linked'
          : 'Link Song'}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: 340,
            maxHeight: 400,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>MetMap Songs</div>
            <input
              type="text"
              placeholder="Search songs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Linked song info + actions */}
          {isLinked && (
            <div style={{
              padding: '8px 12px',
              background: '#eef2ff',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Linked</div>
                <div style={{ fontSize: 13 }}>{linkedSong?.title ?? linkedSongId}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {onToggleConstantTempo && (
                  <button
                    onClick={() => onToggleConstantTempo(!useConstantTempo)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      background: useConstantTempo ? '#fef3c7' : '#fff',
                      cursor: 'pointer',
                    }}
                    title={useConstantTempo ? 'Using constant BPM override' : 'Using MetMap tempo'}
                  >
                    {useConstantTempo ? 'Const BPM' : 'Variable'}
                  </button>
                )}
                <button
                  onClick={() => { onUnlinkSong(); setIsOpen(false); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    border: '1px solid #fca5a5',
                    borderRadius: 4,
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  Unlink
                </button>
              </div>
            </div>
          )}

          {/* Song list */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Loading songs...
              </div>
            )}
            {!loading && songs.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No MetMap songs found
              </div>
            )}
            {!loading && songs.map(song => (
              <button
                key={song.id}
                onClick={() => {
                  onLinkSong(song.id);
                  setIsOpen(false);
                }}
                disabled={song.id === linkedSongId}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  background: song.id === linkedSongId ? '#eef2ff' : '#fff',
                  cursor: song.id === linkedSongId ? 'default' : 'pointer',
                  textAlign: 'left',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: song.id === linkedSongId ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {song.bpmDefault} BPM
                    {song.sectionCount > 0 && ` \u00B7 ${song.sectionCount} sections`}
                    {song.audioDurationSeconds && ` \u00B7 ${formatDuration(song.audioDurationSeconds)}`}
                  </div>
                </div>
                {song.id === linkedSongId && (
                  <span style={{
                    fontSize: 11,
                    color: '#6366f1',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    Linked
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
