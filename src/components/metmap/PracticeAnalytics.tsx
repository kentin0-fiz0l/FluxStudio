/**
 * PracticeAnalytics - Practice progress dashboard for MetMap.
 *
 * Shows session history, tempo progression, section practice heatmap,
 * and summary statistics. Uses canvas for the tempo chart (no chart library).
 */

import { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { PracticeSession, MetMapStats, Section } from '../../contexts/metmap/types';

interface PracticeAnalyticsProps {
  sessions: PracticeSession[];
  stats: MetMapStats | null;
  sections: Section[];
  loading?: boolean;
  className?: string;
}

// ==================== Summary Cards ====================

function SummaryCards({ stats, sessions }: { stats: MetMapStats | null; sessions: PracticeSession[] }) {
  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessions.filter(s => new Date(s.startedAt) >= weekAgo).length;
  }, [sessions]);

  const avgMinutes = useMemo(() => {
    const completed = sessions.filter(s => s.endedAt);
    if (completed.length === 0) return 0;
    const totalMs = completed.reduce((sum, s) => {
      return sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime());
    }, 0);
    return Math.round(totalMs / completed.length / 60000);
  }, [sessions]);

  const mostPracticed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const name = s.settings?.loopedSectionName;
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    for (const [name, count] of counts) {
      if (count > bestCount) { best = name; bestCount = count; }
    }
    return best;
  }, [sessions]);

  const cards: { label: string; value: string | number; unit: string }[] = [
    { label: 'Total Sessions', value: stats?.practiceCount ?? sessions.length, unit: '' },
    { label: 'Total Time', value: stats?.totalPracticeMinutes ?? 0, unit: 'min' },
    { label: 'Avg Session', value: avgMinutes, unit: 'min' },
    { label: mostPracticed ? 'Top Section' : 'This Week', value: mostPracticed || thisWeekCount, unit: '' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map(c => (
        <div key={c.label} className="bg-white/60 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-amber-800">
            {c.value}{c.unit && <span className="text-xs font-normal ml-0.5">{c.unit}</span>}
          </div>
          <div className="text-[10px] text-amber-600 font-medium">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ==================== Tempo Progress Chart (Canvas) ====================

function TempoChart({ sessions }: { sessions: PracticeSession[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dataPoints = useMemo(() => {
    return sessions
      .filter(s => s.settings?.tempoOverride || s.settings?.startTempoPercent)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .map(s => ({
        date: new Date(s.startedAt),
        tempo: s.settings.endTempoPercent ?? s.settings.startTempoPercent ?? s.settings.tempoOverride!,
      }));
  }, [sessions]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (dataPoints.length === 0) {
      ctx.fillStyle = 'rgba(180, 130, 60, 0.4)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No tempo data yet', w / 2, h / 2);
      return;
    }

    const padding = { top: 12, right: 8, bottom: 20, left: 32 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const tempos = dataPoints.map(d => d.tempo);
    const minT = Math.min(...tempos) - 10;
    const maxT = Math.max(...tempos) + 10;
    const range = maxT - minT || 1;

    const toX = (i: number) => padding.left + (i / Math.max(dataPoints.length - 1, 1)) * chartW;
    const toY = (t: number) => padding.top + chartH - ((t - minT) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = 'rgba(180, 130, 60, 0.15)';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (i / gridSteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      // Label
      const val = Math.round(maxT - (i / gridSteps) * range);
      ctx.fillStyle = 'rgba(180, 130, 60, 0.5)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}`, padding.left - 4, y + 3);
    }

    // Area fill
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.beginPath();
    ctx.moveTo(toX(0), padding.top + chartH);
    dataPoints.forEach((d, i) => ctx.lineTo(toX(i), toY(d.tempo)));
    ctx.lineTo(toX(dataPoints.length - 1), padding.top + chartH);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataPoints.forEach((d, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(d.tempo));
      else ctx.lineTo(toX(i), toY(d.tempo));
    });
    ctx.stroke();

    // Dots
    dataPoints.forEach((d, i) => {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(toX(i), toY(d.tempo), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // X-axis label
    ctx.fillStyle = 'rgba(180, 130, 60, 0.4)';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sessions', w / 2, h - 2);
  }, [dataPoints]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="bg-white/60 rounded-lg p-2">
      <div className="text-xs font-medium text-amber-800 mb-1">Tempo Progression</div>
      <canvas ref={canvasRef} className="w-full" style={{ height: 100 }} />
    </div>
  );
}

// ==================== Section Heatmap ====================

function SectionHeatmap({ sections, sessions }: { sections: Section[]; sessions: PracticeSession[] }) {
  // Count how many sessions had each section looped
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    sections.forEach(s => counts.set(s.name, 0));

    for (const session of sessions) {
      const sectionName = session.settings?.loopedSectionName;
      if (sectionName && counts.has(sectionName)) {
        // Real per-section tracking data
        counts.set(sectionName, (counts.get(sectionName) || 0) + 1);
      } else if (!sectionName) {
        // Old session without section data — distribute evenly
        sections.forEach(s => counts.set(s.name, (counts.get(s.name) || 0) + 1));
      }
    }
    return counts;
  }, [sections, sessions]);

  const maxCount = Math.max(1, ...Array.from(sectionCounts.values()));

  if (sections.length === 0) {
    return (
      <div className="bg-white/60 rounded-lg p-2">
        <div className="text-xs font-medium text-amber-800 mb-1">Section Practice</div>
        <div className="text-xs text-amber-600 text-center py-2">No sections</div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 rounded-lg p-2">
      <div className="text-xs font-medium text-amber-800 mb-2">Section Practice</div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {sections.map(s => {
          const count = sectionCounts.get(s.name) || 0;
          const height = Math.max(4, (count / maxCount) * 44);
          const opacity = 0.3 + (count / maxCount) * 0.7;
          return (
            <div key={s.name} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t"
                style={{ height, backgroundColor: `rgba(245, 158, 11, ${opacity})` }}
                title={`${s.name}: ${count} sessions`}
              />
              <div className="text-[8px] text-amber-700 truncate max-w-full">{s.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Session History List ====================

function SessionHistory({ sessions }: { sessions: PracticeSession[] }) {
  const recent = sessions.slice(0, 8);

  if (recent.length === 0) {
    return (
      <div className="bg-white/60 rounded-lg p-2">
        <div className="text-xs font-medium text-amber-800 mb-1">Recent Sessions</div>
        <div className="text-xs text-amber-600 text-center py-3">
          No practice sessions yet. Start one above!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 rounded-lg p-2">
      <div className="text-xs font-medium text-amber-800 mb-1">Recent Sessions</div>
      <div className="space-y-1 max-h-[160px] overflow-y-auto">
        {recent.map(s => {
          const start = new Date(s.startedAt);
          const duration = s.endedAt
            ? Math.round((new Date(s.endedAt).getTime() - start.getTime()) / 60000)
            : null;
          const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

          return (
            <div key={s.id} className="flex items-center justify-between text-xs py-1 px-1 hover:bg-amber-50 rounded">
              <div>
                <span className="text-amber-800">{dateStr}</span>
                <span className="text-amber-500 ml-1">{timeStr}</span>
              </div>
              <div className="flex items-center gap-2">
                {s.settings?.tempoOverride && (
                  <span className="text-amber-600">{s.settings.tempoOverride} BPM</span>
                )}
                {duration !== null ? (
                  <span className="text-amber-700 font-medium">{duration}m</span>
                ) : (
                  <span className="text-amber-400 text-[10px]">in progress</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export const PracticeAnalytics = memo(function PracticeAnalytics({
  sessions,
  stats,
  sections,
  loading,
  className = '',
}: PracticeAnalyticsProps) {
  if (loading) {
    return (
      <div className={`space-y-2 animate-pulse ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-amber-100/50 rounded-lg h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <SummaryCards stats={stats} sessions={sessions} />
      <div className="grid grid-cols-2 gap-2">
        <TempoChart sessions={sessions} />
        <SectionHeatmap sections={sections} sessions={sessions} />
      </div>
      <SessionHistory sessions={sessions} />
    </div>
  );
});

export default PracticeAnalytics;
