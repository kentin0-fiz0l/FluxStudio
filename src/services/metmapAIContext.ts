/**
 * MetMap AI Context — client-side song context serializer.
 *
 * Sprint 34: Mirror of lib/metmap-ai-context.js but works with frontend types.
 * Used for display and for sending context summary to users.
 */

import type { Song, Section, Chord } from '../contexts/metmap/types';

/**
 * Format chords for a section into a readable bar grid.
 */
function formatChordGrid(chords: Chord[], totalBars: number, beatsPerBar = 4): string {
  if (!chords || chords.length === 0) return '  (no chords)';

  const bars: string[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const barChords = chords.filter(c => c.bar === bar);
    const beats = new Array(beatsPerBar).fill('.');

    for (const chord of barChords) {
      const beatIdx = (chord.beat || 1) - 1;
      if (beatIdx >= 0 && beatIdx < beatsPerBar) {
        beats[beatIdx] = chord.symbol;
        for (let d = 1; d < (chord.durationBeats || 1) && beatIdx + d < beatsPerBar; d++) {
          beats[beatIdx + d] = '.';
        }
      }
    }
    bars.push(beats.join(' '));
  }

  const lines: string[] = [];
  for (let i = 0; i < bars.length; i += 4) {
    const slice = bars.slice(i, i + 4);
    lines.push('| ' + slice.join(' | ') + ' |');
  }
  return lines.join('\n');
}

/**
 * Serialize a MetMap song into a structured text summary.
 */
export function serializeMetMapContext(
  song: Song,
  sections: Section[],
): string {
  const lines: string[] = [];

  lines.push(`Song: "${song.title}" — ${song.bpmDefault} BPM, ${song.timeSignatureDefault}`);

  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  lines.push(`${sections.length} sections, ${totalBars} bars total`);

  if (song.detectedBpm) {
    lines.push(`Audio: detected ${song.detectedBpm} BPM`);
  }

  lines.push('');

  for (const section of sections) {
    const tempo = section.tempoStart || song.bpmDefault;
    const tempoEnd = section.tempoEnd;
    let tempoStr = `${tempo} BPM`;
    if (tempoEnd && tempoEnd !== tempo) {
      tempoStr = `${tempo}→${tempoEnd} BPM`;
    }

    lines.push(`${section.name}: ${section.bars} bars, ${tempoStr}`);

    if (section.chords && section.chords.length > 0) {
      const ts = section.timeSignature || song.timeSignatureDefault || '4/4';
      const beatsPerBar = parseInt(ts.split('/')[0]) || 4;
      lines.push(formatChordGrid(section.chords, section.bars, beatsPerBar));
    }
  }

  return lines.join('\n');
}
