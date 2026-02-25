/* eslint-disable react-refresh/only-export-components */
/**
 * MetMap helper constants and utility functions
 */

import * as React from 'react';
import { useState } from 'react';
import type { Song } from '../../contexts/MetMapContext';

// Common chord symbols for quick selection
export const COMMON_CHORDS = [
  'C', 'Cm', 'C7', 'Cmaj7', 'Cm7',
  'D', 'Dm', 'D7', 'Dmaj7', 'Dm7',
  'E', 'Em', 'E7', 'Emaj7', 'Em7',
  'F', 'Fm', 'F7', 'Fmaj7', 'Fm7',
  'G', 'Gm', 'G7', 'Gmaj7', 'Gm7',
  'A', 'Am', 'A7', 'Amaj7', 'Am7',
  'B', 'Bm', 'B7', 'Bmaj7', 'Bm7'
];

export const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Hook for detecting mobile viewport
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

// Song List Item
export function SongListItem({
  song,
  isSelected,
  onClick
}: {
  song: Song;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors text-left w-full ${
        isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="font-medium text-gray-900 truncate">{song.title}</div>
      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
        <span>{song.bpmDefault} BPM</span>
        <span className="text-gray-300">|</span>
        <span>{song.timeSignatureDefault}</span>
        {song.sectionCount > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span>{song.sectionCount} sections</span>
          </>
        )}
      </div>
      {song.projectName && (
        <div className="text-xs text-indigo-600 mt-1 truncate">{song.projectName}</div>
      )}
    </button>
  );
}

// New Song Modal
export function NewSongModal({
  isOpen,
  onClose,
  onCreate
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Song>) => void;
}) {
  const [title, setTitle] = useState('');
  const [bpmDefault, setBpmDefault] = useState(120);
  const [timeSignatureDefault, setTimeSignatureDefault] = useState('4/4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), bpmDefault, timeSignatureDefault });
    setTitle('');
    setBpmDefault(120);
    setTimeSignatureDefault('4/4');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="presentation" onClick={onClose}>
      <div role="dialog" aria-label="New song" className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">New Song</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="My Song"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default BPM</label>
              <input
                type="number"
                value={bpmDefault}
                onChange={(e) => setBpmDefault(parseInt(e.target.value) || 120)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="20"
                max="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Signature</label>
              <select
                value={timeSignatureDefault}
                onChange={(e) => setTimeSignatureDefault(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIME_SIGNATURES.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
