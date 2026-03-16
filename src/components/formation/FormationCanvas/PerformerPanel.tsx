/**
 * Performer side panel for FormationCanvas
 *
 * Enhanced with section grouping, search/filter, drill number display,
 * coordinate info, and bulk selection capabilities.
 */

import React, { ReactElement, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';
import { List, RowComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import type { Formation, Performer } from '../../../services/formationService';

// ============================================================================
// TYPES
// ============================================================================

interface PerformerPanelProps {
  formation: Formation;
  selectedPerformerIds: Set<string>;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onAddPerformer: () => void;
  onRemovePerformer: (id: string) => void;
  /** Callback for bulk add dialog */
  onBulkAdd?: (section: string, instrument: string, count: number) => void;
  /** Whether to show section grouping */
  groupBySection?: boolean;
}

const PERFORMER_ROW_HEIGHT = 48;
const SECTION_HEADER_HEIGHT = 32;

// ============================================================================
// SECTION GROUPING
// ============================================================================

interface SectionGroup {
  section: string;
  performers: Performer[];
  collapsed: boolean;
}

function groupPerformersBySection(performers: Performer[]): SectionGroup[] {
  const groups = new Map<string, Performer[]>();
  const order: string[] = [];

  for (const p of performers) {
    const section = p.section || 'Unassigned';
    if (!groups.has(section)) {
      groups.set(section, []);
      order.push(section);
    }
    groups.get(section)!.push(p);
  }

  return order.map((section) => ({
    section,
    performers: groups.get(section)!,
    collapsed: false,
  }));
}

// Section color map for visual grouping
const SECTION_COLORS: Record<string, string> = {
  Brass: 'bg-amber-500',
  Woodwinds: 'bg-emerald-500',
  Percussion: 'bg-red-500',
  'Color Guard': 'bg-purple-500',
  'Drum Major': 'bg-blue-500',
  Unassigned: 'bg-gray-400',
};

function getSectionColor(section: string): string {
  return SECTION_COLORS[section] || 'bg-gray-400';
}

// ============================================================================
// FLAT ROW DATA (for virtualized list)
// ============================================================================

type FlatRow =
  | { type: 'section'; section: string; count: number; collapsed: boolean }
  | { type: 'performer'; performer: Performer };

function buildFlatRows(
  groups: SectionGroup[],
  collapsedSections: Set<string>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const group of groups) {
    const collapsed = collapsedSections.has(group.section);
    rows.push({
      type: 'section',
      section: group.section,
      count: group.performers.length,
      collapsed,
    });
    if (!collapsed) {
      for (const p of group.performers) {
        rows.push({ type: 'performer', performer: p });
      }
    }
  }
  return rows;
}

// ============================================================================
// BULK ADD DIALOG
// ============================================================================

function BulkAddDialog({
  onAdd,
  onClose,
}: {
  onAdd: (section: string, instrument: string, count: number) => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState('Brass');
  const [instrument, setInstrument] = useState('Trumpet');
  const [count, setCount] = useState(8);

  return (
    <div className="absolute right-0 top-10 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-blue-500" aria-hidden="true" />
        Bulk Add Performers
      </h4>

      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          >
            {['Brass', 'Woodwinds', 'Percussion', 'Color Guard', 'Drum Major'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Instrument</label>
          <input
            type="text"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            placeholder="e.g., Trumpet, Snare"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
            min={1}
            max={50}
            className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onClose}
          className="flex-1 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => { onAdd(section, instrument, count); onClose(); }}
          className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded font-medium"
        >
          Add {count}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ROW COMPONENTS
// ============================================================================

interface PerformerRowData {
  rows: FlatRow[];
  selectedPerformerIds: Set<string>;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onRemovePerformer: (id: string) => void;
  onToggleSection: (section: string) => void;
  onSelectSection: (section: string) => void;
}

function FlatRowComponent({
  index,
  style,
  rows,
  selectedPerformerIds,
  onSelectPerformer,
  onRemovePerformer,
  onToggleSection,
  onSelectSection,
}: RowComponentProps<PerformerRowData>): ReactElement | null {
  const row = rows[index];
  if (!row) return null;

  if (row.type === 'section') {
    return (
      <div style={style}>
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700/50">
          <button
            onClick={() => onToggleSection(row.section)}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={row.collapsed ? `Expand ${row.section}` : `Collapse ${row.section}`}
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${row.collapsed ? '' : 'rotate-90'}`}
              aria-hidden="true"
            />
          </button>
          <span className={`w-2.5 h-2.5 rounded-full ${getSectionColor(row.section)}`} />
          <button
            onClick={() => onSelectSection(row.section)}
            className="flex-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            title="Click to select all in section"
          >
            {row.section}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">{row.count}</span>
        </div>
      </div>
    );
  }

  const performer = row.performer;
  const isSelected = selectedPerformerIds.has(performer.id);

  return (
    <div style={style}>
      <div
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ml-4 ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <button
          type="button"
          className="appearance-none bg-transparent border-none p-0 m-0 cursor-pointer flex items-center gap-2.5 flex-1 min-w-0 text-left"
          onClick={(e) => onSelectPerformer(performer.id, e.metaKey || e.ctrlKey || e.shiftKey)}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: performer.color }}
          >
            {performer.drillNumber || performer.label}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {performer.name}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {[performer.instrument, performer.drillNumber].filter(Boolean).join(' · ') || performer.group || ''}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemovePerformer(performer.id);
          }}
          className="p-0.5 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 hover:opacity-100"
          aria-label={`Remove ${performer.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PerformerPanel: React.FC<PerformerPanelProps> = ({
  formation,
  selectedPerformerIds,
  onSelectPerformer,
  onAddPerformer,
  onRemovePerformer,
  onBulkAdd,
  groupBySection = true,
}) => {
  const { t } = useTranslation('common');
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Filter performers by search query
  const filteredPerformers = useMemo(() => {
    if (!searchQuery.trim()) return formation.performers;
    const q = searchQuery.toLowerCase();
    return formation.performers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.label && p.label.toLowerCase().includes(q)) ||
        (p.instrument && p.instrument.toLowerCase().includes(q)) ||
        (p.section && p.section.toLowerCase().includes(q)) ||
        (p.drillNumber && p.drillNumber.toLowerCase().includes(q)),
    );
  }, [formation.performers, searchQuery]);

  // Group filtered performers by section
  const groups = useMemo(
    () => (groupBySection ? groupPerformersBySection(filteredPerformers) : []),
    [filteredPerformers, groupBySection],
  );

  // Build flat rows for virtualized list
  const flatRows = useMemo(() => {
    if (!groupBySection) {
      return filteredPerformers.map(
        (p): FlatRow => ({ type: 'performer', performer: p }),
      );
    }
    return buildFlatRows(groups, collapsedSections);
  }, [groups, collapsedSections, filteredPerformers, groupBySection]);

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const selectSection = useCallback(
    (section: string) => {
      const group = groups.find((g) => g.section === section);
      if (!group) return;
      for (const p of group.performers) {
        onSelectPerformer(p.id, true);
      }
    },
    [groups, onSelectPerformer],
  );

  const getRowHeight = useCallback(
    (index: number) => {
      const row = flatRows[index];
      return row?.type === 'section' ? SECTION_HEADER_HEIGHT : PERFORMER_ROW_HEIGHT;
    },
    [flatRows],
  );

  const rowProps = useMemo(
    (): PerformerRowData => ({
      rows: flatRows,
      selectedPerformerIds,
      onSelectPerformer,
      onRemovePerformer,
      onToggleSection: toggleSection,
      onSelectSection: selectSection,
    }),
    [flatRows, selectedPerformerIds, onSelectPerformer, onRemovePerformer, toggleSection, selectSection],
  );

  // Section summary
  const sectionSummary = useMemo(() => {
    if (!groupBySection) return null;
    const sections = new Map<string, number>();
    for (const p of formation.performers) {
      const s = p.section || 'Unassigned';
      sections.set(s, (sections.get(s) || 0) + 1);
    }
    return sections;
  }, [formation.performers, groupBySection]);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="font-medium text-gray-900 dark:text-white">
        {t('formation.performers', 'Performers')}
        <span className="ml-1.5 text-xs text-gray-400 font-normal">({formation.performers.length})</span>
      </h3>
      <div className="flex items-center gap-1 relative">
        {onBulkAdd && (
          <button
            onClick={() => setShowBulkAdd((v) => !v)}
            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            title="Bulk add performers"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={onAddPerformer}
          className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
          title={t('formation.addPerformer', 'Add Performer')}
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          onClick={() => setMobileExpanded((e) => !e)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded md:hidden"
          aria-label={mobileExpanded ? 'Collapse performers' : 'Expand performers'}
        >
          {mobileExpanded ? (
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {showBulkAdd && onBulkAdd && (
          <BulkAddDialog
            onAdd={onBulkAdd}
            onClose={() => setShowBulkAdd(false)}
          />
        )}
      </div>
    </div>
  );

  const searchBar = (
    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search performers..."
          className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const listContent = (
    <>
      {flatRows.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
          {searchQuery
            ? 'No performers match your search.'
            : t('formation.noPerformers', 'No performers yet. Click + to add.')}
        </p>
      ) : (
        <AutoSizer
          renderProp={({ height, width }) => (
            <List
              style={{ height: height ?? 0, width: width ?? 0 }}
              rowComponent={FlatRowComponent}
              rowCount={flatRows.length}
              rowHeight={getRowHeight}
              rowProps={rowProps}
              overscanCount={5}
            />
          )}
        />
      )}
    </>
  );

  const footer = (
    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
      {sectionSummary && sectionSummary.size > 1 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {Array.from(sectionSummary.entries()).map(([section, count]) => (
            <span key={section} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${getSectionColor(section)}`} />
              {section} ({count})
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formation.performers.length} {t('formation.performersCount', 'performers')} •{' '}
          {formation.keyframes.length} {t('formation.keyframesCount', 'keyframes')}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: side panel */}
      <div className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col">
        {header}
        {searchBar}
        <div className="flex-1 overflow-hidden p-1">{listContent}</div>
        {footer}
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 transition-all ${
          mobileExpanded ? 'max-h-[50vh]' : 'max-h-[56px]'
        }`}
      >
        <div
          className="flex justify-center py-1 cursor-pointer"
          onClick={() => setMobileExpanded((e) => !e)}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        {header}
        {mobileExpanded && (
          <>
            {searchBar}
            <div className="overflow-hidden p-1" style={{ height: 'calc(50vh - 140px)' }}>
              {listContent}
            </div>
            {footer}
          </>
        )}
      </div>
    </>
  );
};
