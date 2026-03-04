import type { Section, Chord, BeatMap } from '../../contexts/metmap/types';
import type { MetMapPresence } from '../../services/metmapCollaboration';
import type { SectionTemplate } from '../../components/metmap/SectionTemplates';
import { SectionTemplates } from '../../components/metmap/SectionTemplates';
import { SectionRow, ChordGrid } from './MetMapComponents';

interface MetMapSectionListProps {
  isMobile: boolean;
  editedSections: Section[];
  playback: {
    isPlaying: boolean;
    currentSectionIndex: number;
  };
  showChords: boolean;
  setShowChords: (v: boolean) => void;
  showVisualTimeline: boolean;
  setShowVisualTimeline: (v: boolean) => void;
  beatMap?: BeatMap;
  remotePeers: MetMapPresence[];
  seekToBar: (bar: number) => void;
  setPresenceEditingSection: (id: string | null) => void;
  setCurrentEditingSection: (id: string | null) => void;
  snapshotAndAddSection: (data: Partial<Section>) => void;
  snapshotAndUpdateSection: (index: number, changes: Partial<Section>) => void;
  snapshotAndRemoveSection: (index: number) => void;
  snapshotAndReorderSections: (from: number, to: number) => void;
  snapshotAndUpdateChords: (index: number, chords: Chord[]) => void;
  handleAddSectionTemplate: (template: SectionTemplate) => void;
}

export function MetMapSectionList({
  isMobile,
  editedSections,
  playback,
  showChords,
  setShowChords,
  showVisualTimeline,
  setShowVisualTimeline,
  beatMap,
  remotePeers,
  seekToBar,
  setPresenceEditingSection,
  setCurrentEditingSection,
  snapshotAndAddSection,
  snapshotAndUpdateSection,
  snapshotAndRemoveSection,
  snapshotAndReorderSections,
  snapshotAndUpdateChords,
  handleAddSectionTemplate,
}: MetMapSectionListProps) {
  return (
    <div
      className={`flex-1 p-3 sm:p-4 bg-gray-50 ${isMobile ? 'snap-start pb-48 overflow-visible' : 'overflow-y-auto'}`}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        (e.currentTarget as HTMLElement).dataset.swipeX = String(touch.clientX);
      }}
      onTouchEnd={(e) => {
        const startX = Number((e.currentTarget as HTMLElement).dataset.swipeX || 0);
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        if (Math.abs(dx) > 80) {
          // Swipe left → next section, swipe right → previous section
          if (dx < 0) {
            const nextIndex = Math.min(playback.currentSectionIndex + 1, editedSections.length - 1);
            const startBar = editedSections.slice(0, nextIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
            seekToBar(startBar);
          } else {
            const prevIndex = Math.max(playback.currentSectionIndex - 1, 0);
            const startBar = editedSections.slice(0, prevIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
            seekToBar(startBar);
          }
        }
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-700">Sections</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowChords(!showChords)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              showChords ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showChords ? 'Hide' : 'Show'} Chords
          </button>
          {!showVisualTimeline && (
            <button
              onClick={() => setShowVisualTimeline(true)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
            >
              Show Timeline
            </button>
          )}
          <SectionTemplates
            onAddSection={handleAddSectionTemplate}
            compact
          />
        </div>
      </div>

      {editedSections.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-2">No sections yet</div>
          <button
            onClick={() => snapshotAndAddSection({})}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Add your first section
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {editedSections.map((section, index) => {
            const editingPeer = remotePeers.find(p => p.editingSection === section.id);
            return (
            <div
              key={section.id || index}
              role="button"
              tabIndex={0}
              className="relative"
              onFocus={() => { setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); }}
              onClick={() => { setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); } }}
            >
              {/* Presence: colored left border when a remote peer is editing */}
              {editingPeer && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300 z-10"
                  style={{ backgroundColor: editingPeer.color }}
                  title={`${editingPeer.username} is editing`}
                >
                  <span
                    className="absolute -top-4 left-1 text-[9px] font-medium whitespace-nowrap px-1 rounded"
                    style={{ color: editingPeer.color }}
                  >
                    {editingPeer.username}
                  </span>
                </div>
              )}
              <SectionRow
                section={section}
                index={index}
                isPlaying={playback.isPlaying}
                isCurrentSection={playback.currentSectionIndex === index}
                onUpdate={(changes) => snapshotAndUpdateSection(index, changes)}
                onRemove={() => snapshotAndRemoveSection(index)}
                onMoveUp={() => snapshotAndReorderSections(index, index - 1)}
                onMoveDown={() => snapshotAndReorderSections(index, index + 1)}
                canMoveUp={index > 0}
                canMoveDown={index < editedSections.length - 1}
              />
              {showChords && (
                <ChordGrid
                  section={section}
                  sectionIndex={index}
                  chords={section.chords || []}
                  onChordsChange={(chords) => snapshotAndUpdateChords(index, chords)}
                  beatMap={beatMap}
                  onCrossSectionDrop={(chord, direction) => {
                    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= editedSections.length) return;
                    // Remove from source section
                    const srcChords = (section.chords || []).filter(
                      c => !(c.bar === chord.bar && c.beat === chord.beat)
                    );
                    snapshotAndUpdateChords(index, srcChords);
                    // Add to target section (bar 1, beat 1 or last bar)
                    const target = editedSections[targetIndex];
                    const destBar = direction === 'prev' ? target.bars : 1;
                    const destChords = [...(target.chords || []), { ...chord, bar: destBar, beat: 1 }];
                    snapshotAndUpdateChords(targetIndex, destChords);
                  }}
                />
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
