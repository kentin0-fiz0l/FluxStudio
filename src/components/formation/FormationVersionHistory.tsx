/**
 * FormationVersionHistory Component - FluxStudio Phase 9.2
 *
 * Side panel that displays version history for a formation.
 * Users can create checkpoints, preview versions, restore, and delete.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  History,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Clock,
  Tag,
  Check,
  Zap,
  Bookmark,
} from 'lucide-react';
import { FormationVersionHistory as VersionHistoryClass } from '../../services/formationVersionService';
import type { FormationVersion } from '../../services/formationVersionService';
import type { Formation } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

interface FormationVersionHistoryProps {
  formationId: string;
  currentFormation: Formation;
  onRestore: (formation: Formation) => void;
  onClose: () => void;
}

// ============================================================================
// Styles (dark theme matching MetMap / existing dialogs)
// ============================================================================

const styles = {
  panel: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '320px',
    backgroundColor: '#1e1e2e',
    borderLeft: '1px solid #313244',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 40,
    color: '#e0e0e0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #313244',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#cdd6f4',
  },
  closeBtn: {
    padding: '4px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    color: '#6c7086',
    cursor: 'pointer',
  },
  createSection: {
    padding: '12px 16px',
    borderBottom: '1px solid #313244',
    flexShrink: 0,
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #45475a',
    background: '#313244',
    color: '#cdd6f4',
    fontSize: '12px',
    cursor: 'pointer',
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #45475a',
    background: '#181825',
    color: '#cdd6f4',
    fontSize: '12px',
    outline: 'none',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    background: '#89b4fa',
    color: '#1e1e2e',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 8px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    color: '#6c7086',
    fontSize: '11px',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    color: '#45475a',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '12px',
    color: '#6c7086',
  },
  versionItem: {
    padding: '10px 12px',
    borderRadius: '6px',
    marginBottom: '4px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 0.15s, border-color 0.15s',
  },
  versionItemHover: {
    background: '#313244',
    borderColor: '#45475a',
  },
  versionItemSelected: {
    background: '#313244',
    borderColor: '#89b4fa',
  },
  versionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  versionName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#cdd6f4',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 500,
    flexShrink: 0,
  },
  badgeCheckpoint: {
    background: '#89b4fa22',
    color: '#89b4fa',
  },
  badgeAuto: {
    background: '#a6e3a122',
    color: '#a6e3a1',
  },
  versionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    fontSize: '10px',
    color: '#6c7086',
  },
  previewSection: {
    marginTop: '6px',
    padding: '6px 8px',
    borderRadius: '4px',
    background: '#181825',
    fontSize: '11px',
    color: '#a6adc8',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
  },
  restoreBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    background: '#89b4fa',
    color: '#1e1e2e',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  restoreBtnConfirm: {
    background: '#fab387',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    color: '#6c7086',
    fontSize: '11px',
    cursor: 'pointer',
  },
  deleteBtnConfirm: {
    background: '#f38ba822',
    color: '#f38ba8',
  },
  count: {
    fontSize: '10px',
    color: '#6c7086',
    background: '#313244',
    borderRadius: '10px',
    padding: '1px 6px',
  },
} as const;

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Version Item
// ============================================================================

interface VersionItemProps {
  version: FormationVersion;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRestore: (version: FormationVersion) => void;
  onDelete: (id: string) => void;
}

function VersionItem({ version, isSelected, onSelect, onRestore, onDelete }: VersionItemProps) {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRestore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmRestore) {
        onRestore(version);
        setConfirmRestore(false);
      } else {
        setConfirmRestore(true);
        setTimeout(() => setConfirmRestore(false), 3000);
      }
    },
    [confirmRestore, onRestore, version],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        onDelete(version.id);
        setConfirmDelete(false);
      } else {
        setConfirmDelete(true);
        setTimeout(() => setConfirmDelete(false), 3000);
      }
    },
    [confirmDelete, onDelete, version.id],
  );

  const itemStyle = {
    ...styles.versionItem,
    ...(isSelected ? styles.versionItemSelected : {}),
  };

  const badgeStyle = {
    ...styles.badge,
    ...(version.type === 'checkpoint' ? styles.badgeCheckpoint : styles.badgeAuto),
  };

  return (
    <div
      style={itemStyle}
      onClick={() => onSelect(version.id)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          Object.assign(e.currentTarget.style, styles.versionItemHover);
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = '';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`Version: ${version.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(version.id);
        }
      }}
    >
      <div style={styles.versionHeader}>
        <span style={styles.versionName}>{version.name}</span>
        <span style={badgeStyle}>
          {version.type === 'checkpoint' ? (
            <Bookmark style={{ width: 10, height: 10 }} aria-hidden="true" />
          ) : (
            <Zap style={{ width: 10, height: 10 }} aria-hidden="true" />
          )}
          {version.type === 'checkpoint' ? 'checkpoint' : 'auto'}
        </span>
      </div>

      <div style={styles.versionMeta}>
        <Clock style={{ width: 10, height: 10, flexShrink: 0 }} aria-hidden="true" />
        <span>{timeAgo(version.createdAt)}</span>
      </div>

      {isSelected && (
        <>
          <div style={styles.previewSection}>
            <div><strong>{version.snapshot.name}</strong></div>
            <div style={{ marginTop: 2 }}>
              {version.snapshot.performers.length} performer{version.snapshot.performers.length !== 1 ? 's' : ''},{' '}
              {version.snapshot.keyframes.length} keyframe{version.snapshot.keyframes.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={styles.actionRow}>
            <button
              style={{
                ...styles.restoreBtn,
                ...(confirmRestore ? styles.restoreBtnConfirm : {}),
              }}
              onClick={handleRestore}
              aria-label={confirmRestore ? 'Confirm restore' : `Restore version: ${version.name}`}
            >
              <RotateCcw style={{ width: 12, height: 12 }} aria-hidden="true" />
              {confirmRestore ? 'Confirm' : 'Restore'}
            </button>
            <button
              style={{
                ...styles.deleteBtn,
                ...(confirmDelete ? styles.deleteBtnConfirm : {}),
              }}
              onClick={handleDelete}
              aria-label={confirmDelete ? 'Confirm delete' : `Delete version: ${version.name}`}
            >
              <Trash2 style={{ width: 12, height: 12 }} aria-hidden="true" />
              {confirmDelete ? 'Confirm' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationVersionHistoryPanel({
  formationId,
  currentFormation,
  onRestore,
  onClose,
}: FormationVersionHistoryProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create history service (stable across renders for same formationId)
  const historyService = useMemo(
    () => new VersionHistoryClass(formationId),
    [formationId],
  );

  const versions = useMemo(
    () => historyService.getVersions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyService, refreshKey],
  );

  // Auto-focus input when form opens
  useEffect(() => {
    if (showCreateForm) {
      inputRef.current?.focus();
    }
  }, [showCreateForm]);

  const handleCreateCheckpoint = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = checkpointName.trim();
      if (!name) return;
      historyService.createCheckpoint(currentFormation, name, currentFormation.createdBy);
      setCheckpointName('');
      setShowCreateForm(false);
      setRefreshKey((k) => k + 1);
    },
    [checkpointName, currentFormation, historyService],
  );

  const handleRestore = useCallback(
    (version: FormationVersion) => {
      onRestore(structuredClone(version.snapshot));
    },
    [onRestore],
  );

  const handleDelete = useCallback(
    (versionId: string) => {
      historyService.deleteVersion(versionId);
      if (selectedVersionId === versionId) {
        setSelectedVersionId(null);
      }
      setRefreshKey((k) => k + 1);
    },
    [historyService, selectedVersionId],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedVersionId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div style={styles.panel} role="complementary" aria-label="Version history">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <History style={{ width: 14, height: 14 }} aria-hidden="true" />
          <span>Version History</span>
          {versions.length > 0 && <span style={styles.count}>{versions.length}</span>}
        </div>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close version history"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#cdd6f4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6c7086';
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Create Checkpoint */}
      <div style={styles.createSection}>
        {showCreateForm ? (
          <form onSubmit={handleCreateCheckpoint}>
            <div style={styles.formRow}>
              <Tag style={{ width: 14, height: 14, flexShrink: 0, color: '#6c7086' }} aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="Checkpoint name..."
                maxLength={60}
                style={styles.input}
                aria-label="Checkpoint name"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCreateForm(false);
                    setCheckpointName('');
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => {
                  setShowCreateForm(false);
                  setCheckpointName('');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.saveBtn,
                  opacity: checkpointName.trim() ? 1 : 0.4,
                  cursor: checkpointName.trim() ? 'pointer' : 'not-allowed',
                }}
                disabled={!checkpointName.trim()}
              >
                <Check style={{ width: 12, height: 12 }} aria-hidden="true" />
                Save
              </button>
            </div>
          </form>
        ) : (
          <button
            style={styles.createBtn}
            onClick={() => setShowCreateForm(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#89b4fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#45475a';
            }}
          >
            <Plus style={{ width: 14, height: 14 }} aria-hidden="true" />
            Create Checkpoint
          </button>
        )}
      </div>

      {/* Version List */}
      <div style={styles.list}>
        {versions.length === 0 ? (
          <div style={styles.emptyState}>
            <History style={{ ...styles.emptyIcon, width: 32, height: 32 }} aria-hidden="true" />
            <p style={styles.emptyText}>No versions yet</p>
            <p style={{ ...styles.emptyText, marginTop: 2, fontSize: 10 }}>
              Create a checkpoint to save a restore point
            </p>
          </div>
        ) : (
          versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={selectedVersionId === version.id}
              onSelect={handleSelect}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default FormationVersionHistoryPanel;
