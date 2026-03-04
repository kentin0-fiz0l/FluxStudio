import type { Section, Chord } from '../../contexts/metmap/types';
import { MetMapAIPanel } from '../../components/metmap/MetMapAIPanel';
import { Drawer, DrawerContent } from '../../components/ui/drawer';

interface MetMapAIRegionProps {
  isMobile: boolean;
  songId: string;
  token: string;
  sections: Section[];
  showAIPanel: boolean;
  setShowAIPanel: (v: boolean) => void;
  onApplyChords: (sectionIndex: number, chords: Chord[]) => void;
}

export function MetMapAIRegion({
  isMobile,
  songId,
  token,
  sections,
  showAIPanel,
  setShowAIPanel,
  onApplyChords,
}: MetMapAIRegionProps) {
  if (isMobile) {
    return (
      <Drawer direction="bottom" open={showAIPanel} onOpenChange={setShowAIPanel}>
        <DrawerContent className="max-h-[80vh]">
          <MetMapAIPanel
            songId={songId}
            token={token}
            sections={sections}
            onClose={() => setShowAIPanel(false)}
            onApplyChords={onApplyChords}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!showAIPanel) return null;

  return (
    <MetMapAIPanel
      songId={songId}
      token={token}
      sections={sections}
      onClose={() => setShowAIPanel(false)}
      onApplyChords={onApplyChords}
    />
  );
}
