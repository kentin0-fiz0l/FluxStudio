import type { Section, PracticeSession, MetMapStats } from '../../contexts/metmap/types';
import { PracticeMode, type PracticeStartInfo } from '../../components/metmap/PracticeMode';
import { PracticeAnalytics } from '../../components/metmap/PracticeAnalytics';

interface MetMapPracticeRegionProps {
  isMobile: boolean;
  editedSections: Section[];
  loopSection: number | null;
  setLoopSection: (v: number | null) => void;
  tempoPercent: number;
  setTempoPercent: (v: number) => void;
  repetitionCount: number;
  practiceMode: boolean;
  practiceStartInfo: PracticeStartInfo | null;
  setPracticeStartInfo: (v: PracticeStartInfo | null | ((prev: PracticeStartInfo | null) => PracticeStartInfo | null)) => void;
  setPracticeMode: (v: boolean) => void;
  setRepetitionCount: (v: number | ((prev: number) => number)) => void;
  showPracticeStats: boolean;
  setShowPracticeStats: (v: boolean) => void;
  practiceHistory: PracticeSession[];
  practiceStats: MetMapStats | null;
  practiceHistoryLoading: boolean;
}

export function MetMapPracticeRegion({
  isMobile,
  editedSections,
  loopSection,
  setLoopSection,
  tempoPercent,
  setTempoPercent,
  repetitionCount,
  practiceMode,
  practiceStartInfo,
  setPracticeStartInfo,
  setPracticeMode,
  setRepetitionCount,
  showPracticeStats,
  setShowPracticeStats,
  practiceHistory,
  practiceStats,
  practiceHistoryLoading,
}: MetMapPracticeRegionProps) {
  return (
    <div className={`px-4 py-2 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
      <PracticeMode
        sections={editedSections}
        loopSection={loopSection}
        onLoopSectionChange={setLoopSection}
        tempoPercent={tempoPercent}
        onTempoPercentChange={setTempoPercent}
        repetitionCount={repetitionCount}
        isActive={practiceMode}
        onPracticeStart={(info) => setPracticeStartInfo(info)}
        onToggleActive={() => {
          if (practiceMode && practiceStartInfo) {
            // Ending practice — record end tempo
            setPracticeStartInfo(prev => prev ? { ...prev, endTempoPercent: tempoPercent } as PracticeStartInfo & { endTempoPercent: number } : null);
          }
          setPracticeMode(!practiceMode);
          if (!practiceMode) setRepetitionCount(0);
        }}
      />
      {/* Stats toggle */}
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => setShowPracticeStats(!showPracticeStats)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            showPracticeStats
              ? 'bg-amber-200 text-amber-800'
              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
          }`}
        >
          {showPracticeStats ? 'Hide Stats' : 'Stats'}
        </button>
      </div>
      {showPracticeStats && (
        <PracticeAnalytics
          sessions={practiceHistory}
          stats={practiceStats}
          sections={editedSections}
          loading={practiceHistoryLoading}
          className="mt-2"
        />
      )}
    </div>
  );
}
