/**
 * DrillAnalysisPanel - Virtual Clinic UI
 *
 * Displays drill analysis results with collision, stride, and direction
 * change issues. Click-to-navigate to offending sets.
 */

import React, { useState, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  Shield,
  Footprints,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import type { Formation, DrillSet } from '../../services/formationTypes';
import type { TempoMap } from '../../services/tempoMap';
import {
  fullDrillAnalysis,
  type AnalysisResult,
  type AnalysisConfig,
  type DrillIssue,
  type IssueSeverity,
  DEFAULT_ANALYSIS_CONFIG,
} from '../../services/drillAnalysis';

interface DrillAnalysisPanelProps {
  formation: Formation;
  sets: DrillSet[];
  config?: AnalysisConfig;
  tempoMap?: TempoMap;
  onNavigateToSet?: (setId: string, performerIds?: string[]) => void;
}

const severityIcon: Record<IssueSeverity, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const severityColor: Record<IssueSeverity, string> = {
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

/** Inline SVG icon: metronome for tempo-aware stride */
const TempoStrideIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 14L8 2l3 12H5z" />
    <path d="M8 5l4-2" />
  </svg>
);

/** Inline SVG icon: music note for alignment */
const MusicAlignIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13V4l8-2v9" />
    <circle cx="4" cy="13" r="2" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

/** Inline SVG icon: tempo change (BPM shift) */
const TempoChangeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10h4l2-4 2 4h4" />
    <path d="M12 6l2-2m0 0l-2-2m2 2H10" />
  </svg>
);

const typeIcon: Record<DrillIssue['type'], React.ReactNode> = {
  collision: <Shield className="w-3.5 h-3.5" />,
  stride: <Footprints className="w-3.5 h-3.5" />,
  direction_change: <RotateCcw className="w-3.5 h-3.5" />,
  tempo_aware_stride: <TempoStrideIcon />,
  music_alignment: <MusicAlignIcon />,
  tempo_change_transition: <TempoChangeIcon />,
};

export const DrillAnalysisPanel: React.FC<DrillAnalysisPanelProps> = ({
  formation,
  sets,
  config = DEFAULT_ANALYSIS_CONFIG,
  tempoMap,
  onNavigateToSet,
}) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedType, setExpandedType] = useState<DrillIssue['type'] | 'all'>('all');

  const handleRunAnalysis = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const analysisResult = fullDrillAnalysis(formation, sets, config, tempoMap);
      setResult(analysisResult);
      setIsRunning(false);
    }, 0);
  }, [formation, sets, config, tempoMap]);

  const handleIssueClick = useCallback(
    (issue: DrillIssue) => {
      if (issue.setId && onNavigateToSet) {
        onNavigateToSet(issue.setId, issue.performerIds);
      }
    },
    [onNavigateToSet],
  );

  const filteredIssues = result?.issues.filter(
    (i) => expandedType === 'all' || i.type === expandedType,
  ) ?? [];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Drill Analysis
        </h3>
        <button
          onClick={handleRunAnalysis}
          disabled={isRunning || sets.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5" />
          {isRunning ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Summary Cards */}
      {result && (
        <div className="grid grid-cols-4 gap-2 p-4">
          <SummaryCard
            label="Total"
            value={result.summary.totalIssues}
            color="gray"
          />
          <SummaryCard
            label="Errors"
            value={result.summary.errors}
            color="red"
          />
          <SummaryCard
            label="Warnings"
            value={result.summary.warnings}
            color="amber"
          />
          <SummaryCard
            label="Collisions"
            value={result.summary.collisionCount}
            color="purple"
          />
        </div>
      )}

      {/* Musical Flow Score */}
      {result && tempoMap && result.summary.musicalFlowScore !== undefined && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg border" style={{
          backgroundColor: result.summary.musicalFlowScore > 80
            ? 'rgb(240, 253, 244)' : result.summary.musicalFlowScore >= 50
            ? 'rgb(254, 252, 232)' : 'rgb(254, 242, 242)',
          borderColor: result.summary.musicalFlowScore > 80
            ? 'rgb(187, 247, 208)' : result.summary.musicalFlowScore >= 50
            ? 'rgb(254, 240, 138)' : 'rgb(254, 202, 202)',
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MusicAlignIcon />
              <span className="text-xs font-medium" style={{
                color: result.summary.musicalFlowScore > 80
                  ? 'rgb(21, 128, 61)' : result.summary.musicalFlowScore >= 50
                  ? 'rgb(161, 98, 7)' : 'rgb(185, 28, 28)',
              }}>
                Musical Flow
              </span>
            </div>
            <span className="text-lg font-bold" style={{
              color: result.summary.musicalFlowScore > 80
                ? 'rgb(21, 128, 61)' : result.summary.musicalFlowScore >= 50
                ? 'rgb(161, 98, 7)' : 'rgb(185, 28, 28)',
            }}>
              {result.summary.musicalFlowScore}
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${result.summary.musicalFlowScore}%`,
                backgroundColor: result.summary.musicalFlowScore > 80
                  ? 'rgb(34, 197, 94)' : result.summary.musicalFlowScore >= 50
                  ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)',
              }}
            />
          </div>
        </div>
      )}

      {/* Worst stride */}
      {result?.summary.worstStride && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Worst stride: {result.summary.worstStride.performerName} at{' '}
            {result.summary.worstStride.setName} ({result.summary.worstStride.stepSize.toFixed(1)}-to-5)
          </p>
        </div>
      )}

      {/* Filter tabs */}
      {result && (
        <div className="flex items-center gap-1 px-4 mb-2 flex-wrap">
          {(
            [
              'all',
              'collision',
              'stride',
              'direction_change',
              ...(tempoMap ? ['tempo_aware_stride', 'music_alignment', 'tempo_change_transition'] as const : []),
            ] as const
          ).map((t) => (
            <button
              key={t}
              onClick={() => setExpandedType(t as DrillIssue['type'] | 'all')}
              className={`px-2 py-1 text-xs rounded ${
                expandedType === t
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t === 'all' ? 'All'
                : t === 'collision' ? 'Collisions'
                : t === 'stride' ? 'Strides'
                : t === 'direction_change' ? 'Direction'
                : t === 'tempo_aware_stride' ? 'Tempo Strides'
                : t === 'music_alignment' ? 'Music Alignment'
                : t === 'tempo_change_transition' ? 'Tempo Changes'
                : t}
            </button>
          ))}
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!result && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Click "Run Analysis" to check your drill</p>
            <p className="text-xs mt-1">Checks collisions, step sizes, and direction changes</p>
          </div>
        )}

        {result && filteredIssues.length === 0 && (
          <div className="text-center py-8 text-green-600 dark:text-green-400">
            <Shield className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm font-medium">No issues found!</p>
          </div>
        )}

        {filteredIssues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => handleIssueClick(issue)}
            className={`w-full text-left p-3 rounded-lg border mb-2 transition-colors hover:opacity-80 ${severityColor[issue.severity]}`}
          >
            <div className="flex items-start gap-2">
              {severityIcon[issue.severity]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {typeIcon[issue.type]}
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {issue.type.replace('_', ' ')}
                  </span>
                  {issue.setName && (
                    <span className="text-xs text-gray-400">at {issue.setName}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{issue.message}</p>
                {issue.stepInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    {issue.stepInfo.stepSizeLabel} • {issue.stepInfo.distanceYards.toFixed(1)} yards • {issue.stepInfo.directionLabel}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className={`rounded-lg p-2 text-center ${colorClasses[color] ?? colorClasses.gray}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}
