/**
 * ProductionSheetView - Pyware-style production sheet table
 *
 * Maps music structure to drill design in a tabular format.
 * Supports inline editing with bidirectional propagation to
 * DrillSets and MetMap sections.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { DrillSet } from '../../services/formationTypes';
import type { TempoMap } from '../../services/tempoMap';
import type {
  ProductionSheet,
  ProductionSheetEntry,
  EntryUpdate,
} from '../../services/productionSheet';
import {
  buildProductionSheet,
  updateProductionSheetEntry,
  exportProductionSheetCsv,
  importProductionSheetCsv,
} from '../../services/productionSheet';

// ============================================================================
// TYPES
// ============================================================================

interface ProductionSheetViewProps {
  sets: DrillSet[];
  tempoMap: TempoMap;
  formationId: string;
  songId?: string;
  currentSetId?: string | null;
  onSetSelect?: (setId: string) => void;
  onSetUpdate?: (setId: string, updates: Partial<DrillSet>) => void;
  onSetAdd?: (afterIndex?: number) => void;
  onSetRemove?: (setId: string) => void;
  onSectionTempoUpdate?: (sectionId: string, tempo: number) => void;
  onExportPdf?: (sheet: ProductionSheet) => void;
}

// Section colors for row highlighting
const SECTION_COLORS = [
  '#eef2ff', '#fef3c7', '#ecfdf5', '#fce7f3',
  '#f0f9ff', '#fef9c3', '#f0fdf4', '#fdf2f8',
  '#eff6ff', '#fffbeb', '#f0fdfa', '#fdf4ff',
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ProductionSheetView: React.FC<ProductionSheetViewProps> = ({
  sets,
  tempoMap,
  formationId,
  songId,
  currentSetId,
  onSetSelect,
  onSetUpdate,
  onSetAdd,
  onSetRemove,
  onSectionTempoUpdate,
  onExportPdf,
}) => {
  const [editingCell, setEditingCell] = useState<{ entryId: string; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entryId: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build production sheet from current state
  const sheet = useMemo(
    () => buildProductionSheet(sets, tempoMap, formationId, songId),
    [sets, tempoMap, formationId, songId],
  );

  // Map section names to colors
  const sectionColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIdx = 0;
    for (const entry of sheet.entries) {
      const key = entry.sectionName ?? 'default';
      if (!map.has(key)) {
        map.set(key, SECTION_COLORS[colorIdx % SECTION_COLORS.length]);
        colorIdx++;
      }
    }
    return map;
  }, [sheet.entries]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Start editing a cell
  const startEdit = useCallback((entryId: string, column: string, currentValue: string) => {
    setEditingCell({ entryId, column });
    setEditValue(currentValue);
  }, []);

  // Commit edit
  const commitEdit = useCallback(() => {
    if (!editingCell) return;

    const updates: EntryUpdate = {};
    const val = editValue.trim();

    switch (editingCell.column) {
      case 'counts':
        updates.counts = Math.max(1, parseInt(val) || 8);
        break;
      case 'tempo':
        updates.tempo = Math.max(20, Math.min(400, parseInt(val) || 120));
        break;
      case 'rehearsalMark':
        updates.rehearsalMark = val || undefined;
        break;
      case 'notes':
        updates.notes = val || undefined;
        break;
      case 'sectionName':
        updates.sectionName = val || undefined;
        break;
    }

    const result = updateProductionSheetEntry(sheet, editingCell.entryId, updates);

    // Propagate set updates
    result.setUpdates.forEach((upd, setId) => {
      onSetUpdate?.(setId, upd);
    });

    // Propagate section tempo updates
    result.sectionTempoUpdates.forEach((tempo, sectionId) => {
      onSectionTempoUpdate?.(sectionId, tempo);
    });

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, sheet, onSetUpdate, onSectionTempoUpdate]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Could advance to next editable cell here
    }
  }, [commitEdit, cancelEdit]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entryId });
  }, []);

  // Close context menu
  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [contextMenu]);

  // Export CSV
  const handleExportCsv = useCallback(() => {
    const csv = exportProductionSheetCsv(sheet);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production-sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sheet]);

  // Import CSV — parse and apply to formation via callbacks
  const handleImportCsv = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imported = importProductionSheetCsv(reader.result as string, formationId);
        if (imported.entries.length === 0) return;

        // Match imported entries to existing sets by index, update or create
        imported.entries.forEach((entry, idx) => {
          if (idx < sets.length) {
            // Update existing set with imported data
            const existingSet = sets[idx];
            onSetUpdate?.(existingSet.id, {
              counts: entry.counts,
              rehearsalMark: entry.rehearsalMark,
              notes: entry.notes,
            });
            // Propagate tempo to MetMap section
            if (entry.tempo && entry.sectionId) {
              onSectionTempoUpdate?.(entry.sectionId, entry.tempo);
            }
          } else {
            // Add new sets for extra imported entries
            onSetAdd?.(sets.length + idx - 1);
          }
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [formationId, sets, onSetUpdate, onSetAdd, onSectionTempoUpdate]);

  // Render editable cell
  const renderCell = (entry: ProductionSheetEntry, column: string, value: string, editable: boolean = true) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.column === column;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type={column === 'counts' || column === 'tempo' ? 'number' : 'text'}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          style={{
            width: '100%',
            padding: '2px 4px',
            border: '2px solid #6366f1',
            borderRadius: 3,
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      );
    }

    return (
      <span
        onDoubleClick={editable ? () => startEdit(entry.id, column, value) : undefined}
        style={{
          cursor: editable ? 'text' : 'default',
          display: 'block',
          padding: '2px 4px',
          borderRadius: 3,
        }}
      >
        {value || '\u00A0'}
      </span>
    );
  };

  const formatDuration = (ms: number) => {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Production Sheet</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            {sheet.totalCounts} counts \u00B7 {formatDuration(sheet.totalDurationMs)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleImportCsv} style={toolbarButtonStyle} title="Import CSV">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button onClick={handleExportCsv} style={toolbarButtonStyle} title="Export CSV">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </button>
          {onExportPdf && (
            <button onClick={() => onExportPdf(sheet)} style={toolbarButtonStyle} title="Export PDF">
              PDF
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
              {['Set', 'Section', 'Measures', 'Counts', 'Cumul.', 'Tempo', 'Reh. Mark', 'Notes'].map(col => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.entries.map((entry, idx) => {
              const bgColor = sectionColorMap.get(entry.sectionName ?? 'default') ?? '#fff';
              const isCurrent = entry.setId === currentSetId;

              return (
                <tr
                  key={entry.id}
                  onClick={() => onSetSelect?.(entry.setId)}
                  onContextMenu={e => handleContextMenu(e, entry.id)}
                  style={{
                    background: isCurrent ? '#dbeafe' : bgColor,
                    borderLeft: isCurrent ? '3px solid #3b82f6' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>
                      {sets.find(s => s.id === entry.setId)?.name ?? `Set ${idx + 1}`}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {renderCell(entry, 'sectionName', entry.sectionName ?? '')}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                    m{entry.startMeasure}{entry.endMeasure !== entry.startMeasure ? `\u2013${entry.endMeasure}` : ''}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {renderCell(entry, 'counts', String(entry.counts))}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                    {entry.cumulativeCount}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {renderCell(entry, 'tempo', String(entry.tempo))}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {renderCell(entry, 'rehearsalMark', entry.rehearsalMark ?? '')}
                  </td>
                  <td style={tdStyle}>
                    {renderCell(entry, 'notes', entry.notes ?? '')}
                  </td>
                </tr>
              );
            })}
            {sheet.entries.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                  No sets defined. Add sets to build the production sheet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
          padding: 4,
          minWidth: 160,
        }}>
          {onSetAdd && (
            <>
              <button
                onClick={() => {
                  const entry = sheet.entries.find(e => e.id === contextMenu.entryId);
                  const setIdx = sets.findIndex(s => s.id === entry?.setId);
                  onSetAdd(setIdx > 0 ? setIdx - 1 : undefined);
                  setContextMenu(null);
                }}
                style={menuItemStyle}
              >
                Insert Before
              </button>
              <button
                onClick={() => {
                  const entry = sheet.entries.find(e => e.id === contextMenu.entryId);
                  const setIdx = sets.findIndex(s => s.id === entry?.setId);
                  onSetAdd(setIdx >= 0 ? setIdx : undefined);
                  setContextMenu(null);
                }}
                style={menuItemStyle}
              >
                Insert After
              </button>
            </>
          )}
          {onSetRemove && (
            <button
              onClick={() => {
                const entry = sheet.entries.find(e => e.id === contextMenu.entryId);
                if (entry) onSetRemove(entry.setId);
                setContextMenu(null);
              }}
              style={{ ...menuItemStyle, color: '#dc2626' }}
            >
              Delete Set
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 11,
  color: '#6b7280',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

const toolbarButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 12px',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 4,
};
