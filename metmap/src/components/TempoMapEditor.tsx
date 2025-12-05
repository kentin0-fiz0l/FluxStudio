'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Clock,
  Music,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMetMapStore } from '@/stores/useMetMapStore';
import {
  TempoEvent,
  TempoChangeType,
  TimeSignature,
  formatTime,
  parseTime,
  formatTimeSignature,
  parseTimeSignature,
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
} from '@/types/metmap';

interface TempoMapEditorProps {
  songId: string;
}

const CHANGE_TYPE_LABELS: Record<TempoChangeType, { label: string; icon: typeof Clock }> = {
  instant: { label: 'Instant', icon: Zap },
  ramp: { label: 'Ramp', icon: TrendingUp },
  step: { label: 'Step', icon: ChevronUp },
  swing: { label: 'Swing', icon: Music },
};

const COMMON_TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];

export function TempoMapEditor({ songId }: TempoMapEditorProps) {
  const song = useMetMapStore((state) => state.getSong(songId));
  const updateSongTempo = useMetMapStore((state) => state.updateSongTempo);
  const updateTempoEvent = useMetMapStore((state) => state.updateTempoEvent);
  const deleteTempoEvent = useMetMapStore((state) => state.deleteTempoEvent);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  if (!song) return null;

  const tempoEvents = song.tempoEvents || [];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-metmap-500/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-metmap-500" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Tempo Map
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {song.bpm || DEFAULT_BPM} BPM,{' '}
              {formatTimeSignature(song.defaultTimeSignature || DEFAULT_TIME_SIGNATURE)}
              {tempoEvents.length > 0 && ` • ${tempoEvents.length} changes`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Default tempo settings */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Starting Tempo
            </h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">BPM</label>
                <input
                  type="number"
                  value={song.bpm || DEFAULT_BPM}
                  onChange={(e) => {
                    const bpm = parseInt(e.target.value, 10);
                    if (bpm >= 20 && bpm <= 400) {
                      updateSongTempo(songId, bpm);
                    }
                  }}
                  min={20}
                  max={400}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Time Signature</label>
                <select
                  value={formatTimeSignature(song.defaultTimeSignature || DEFAULT_TIME_SIGNATURE)}
                  onChange={(e) => {
                    const ts = parseTimeSignature(e.target.value);
                    updateSongTempo(songId, song.bpm || DEFAULT_BPM, ts);
                  }}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                >
                  {COMMON_TIME_SIGNATURES.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tempo events list */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tempo Changes
              </h4>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-metmap-500 hover:bg-metmap-50 dark:hover:bg-metmap-900/20 rounded font-medium"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {tempoEvents.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No tempo changes. Add events for accelerandos, ritardandos, or meter changes.
              </p>
            ) : (
              <div className="space-y-2">
                {tempoEvents.map((event) => (
                  <TempoEventCard
                    key={event.id}
                    event={event}
                    isEditing={editingEventId === event.id}
                    onEdit={() => setEditingEventId(event.id)}
                    onClose={() => setEditingEventId(null)}
                    onUpdate={(updates) => updateTempoEvent(songId, event.id, updates)}
                    onDelete={() => deleteTempoEvent(songId, event.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add Event Modal */}
          {showAddEvent && (
            <AddTempoEventModal
              songId={songId}
              defaultBpm={song.bpm || DEFAULT_BPM}
              defaultTimeSignature={song.defaultTimeSignature || DEFAULT_TIME_SIGNATURE}
              onClose={() => setShowAddEvent(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TempoEventCard({
  event,
  isEditing,
  onEdit,
  onClose,
  onUpdate,
  onDelete,
}: {
  event: TempoEvent;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdate: (updates: Partial<TempoEvent>) => void;
  onDelete: () => void;
}) {
  const [editTime, setEditTime] = useState(formatTime(event.time));
  const [editBpm, setEditBpm] = useState(event.bpm.toString());
  const [editTs, setEditTs] = useState(formatTimeSignature(event.timeSignature));
  const [editType, setEditType] = useState(event.changeType);
  const [editRampDuration, setEditRampDuration] = useState(
    event.rampDuration?.toString() || ''
  );
  const [editLabel, setEditLabel] = useState(event.label || '');

  const handleSave = () => {
    onUpdate({
      time: parseTime(editTime),
      bpm: parseInt(editBpm, 10) || event.bpm,
      timeSignature: parseTimeSignature(editTs),
      changeType: editType,
      rampDuration: editType === 'ramp' ? parseFloat(editRampDuration) || undefined : undefined,
      label: editLabel.trim() || undefined,
    });
    onClose();
  };

  const TypeIcon = CHANGE_TYPE_LABELS[event.changeType].icon;

  if (isEditing) {
    return (
      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-metmap-500 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time</label>
            <input
              type="text"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              placeholder="0:00"
              className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">BPM</label>
            <input
              type="number"
              value={editBpm}
              onChange={(e) => setEditBpm(e.target.value)}
              min={20}
              max={400}
              className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Meter</label>
            <select
              value={editTs}
              onChange={(e) => setEditTs(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
            >
              {COMMON_TIME_SIGNATURES.map((ts) => (
                <option key={ts} value={ts}>
                  {ts}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Change Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as TempoChangeType)}
              className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
            >
              {Object.entries(CHANGE_TYPE_LABELS).map(([type, { label }]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {editType === 'ramp' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ramp Duration (s)</label>
              <input
                type="number"
                value={editRampDuration}
                onChange={(e) => setEditRampDuration(e.target.value)}
                step={0.5}
                min={0.5}
                placeholder="2.0"
                className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="e.g., Accelerando, A Tempo"
            className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-metmap-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1.5 text-sm bg-metmap-500 hover:bg-metmap-600 text-white rounded font-medium"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors"
      onClick={onEdit}
    >
      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <TypeIcon className="w-4 h-4 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatTime(event.time)}
          </span>
          {event.label && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
              {event.label}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {event.bpm} BPM • {formatTimeSignature(event.timeSignature)} •{' '}
          {CHANGE_TYPE_LABELS[event.changeType].label}
          {event.changeType === 'ramp' && event.rampDuration && ` (${event.rampDuration}s)`}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this tempo change?')) {
            onDelete();
          }
        }}
        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddTempoEventModal({
  songId,
  defaultBpm,
  defaultTimeSignature,
  onClose,
}: {
  songId: string;
  defaultBpm: number;
  defaultTimeSignature: TimeSignature;
  onClose: () => void;
}) {
  const addTempoEvent = useMetMapStore((state) => state.addTempoEvent);
  const [time, setTime] = useState('0:00');
  const [bpm, setBpm] = useState(defaultBpm.toString());
  const [timeSignature, setTimeSignature] = useState(formatTimeSignature(defaultTimeSignature));
  const [changeType, setChangeType] = useState<TempoChangeType>('instant');
  const [rampDuration, setRampDuration] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTempoEvent(songId, {
      time: parseTime(time),
      bpm: parseInt(bpm, 10) || defaultBpm,
      timeSignature: parseTimeSignature(timeSignature),
      changeType,
      rampDuration: changeType === 'ramp' ? parseFloat(rampDuration) || undefined : undefined,
      label: label.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add Tempo Change
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="0:30"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">BPM</label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    min={20}
                    max={400}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time Signature</label>
                  <select
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  >
                    {COMMON_TIME_SIGNATURES.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Change Type</label>
                  <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value as TempoChangeType)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  >
                    {Object.entries(CHANGE_TYPE_LABELS).map(([type, { label }]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {changeType === 'ramp' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Ramp Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={rampDuration}
                    onChange={(e) => setRampDuration(e.target.value)}
                    step={0.5}
                    min={0.5}
                    placeholder="2.0"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Accelerando, Ritardando"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-metmap-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
