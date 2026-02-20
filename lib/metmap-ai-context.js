/**
 * MetMap AI Context Builder — server-side song context serializer for Claude prompts.
 *
 * Sprint 34: Converts a song's full state into structured text suitable for AI analysis.
 * Keeps output under ~2000 tokens for typical songs.
 */

/**
 * Format chords into a readable bar grid.
 * Output: | Cmaj7 . . . | Am7 . . . | Dm7 . G7 . |
 */
function formatChordGrid(chords, totalBars, beatsPerBar = 4) {
  if (!chords || chords.length === 0) return '  (no chords)';

  const bars = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const barChords = chords.filter(c => c.bar === bar);
    const beats = new Array(beatsPerBar).fill('.');

    for (const chord of barChords) {
      const beatIdx = (chord.beat || 1) - 1;
      if (beatIdx >= 0 && beatIdx < beatsPerBar) {
        beats[beatIdx] = chord.symbol;
        // Fill held beats
        for (let d = 1; d < (chord.durationBeats || 1) && beatIdx + d < beatsPerBar; d++) {
          beats[beatIdx + d] = '.';
        }
      }
    }
    bars.push(beats.join(' '));
  }

  // Group bars into lines of 4
  const lines = [];
  for (let i = 0; i < bars.length; i += 4) {
    const slice = bars.slice(i, i + 4);
    lines.push('  | ' + slice.join(' | ') + ' |');
  }
  return lines.join('\n');
}

/**
 * Build a structured text context for a MetMap song.
 *
 * @param {Object} song - Song record from DB
 * @param {Array} sections - Section records from DB
 * @param {Array} chords - Chord records from DB (with sectionName, sectionOrder)
 * @param {Object} options
 * @param {Array} [options.practiceHistory] - Practice session records
 * @param {boolean} [options.includeAnimations] - Include keyframe summary
 * @returns {string} Structured context text
 */
function buildMetMapContext(song, sections, chords, options = {}) {
  const { practiceHistory, includeAnimations } = options;
  const lines = [];

  // Song header
  lines.push('## Song Overview');
  lines.push(`Title: ${song.title || 'Untitled'}`);
  lines.push(`Default Tempo: ${song.bpmDefault || song.bpm_default || 120} BPM`);
  lines.push(`Time Signature: ${song.timeSignatureDefault || song.time_signature_default || '4/4'}`);
  lines.push(`Sections: ${sections.length}`);

  const totalBars = sections.reduce((sum, s) => sum + (s.bars || 0), 0);
  lines.push(`Total Bars: ${totalBars}`);

  if (song.detectedBpm || song.detected_bpm) {
    const bpm = song.detectedBpm || song.detected_bpm;
    lines.push(`Detected BPM (from audio): ${bpm}`);
  }

  if (song.audioDurationSeconds || song.audio_duration_seconds) {
    const dur = song.audioDurationSeconds || song.audio_duration_seconds;
    const mins = Math.floor(dur / 60);
    const secs = Math.round(dur % 60);
    lines.push(`Audio Duration: ${mins}:${secs.toString().padStart(2, '0')}`);
  }

  // Section breakdown with chords
  lines.push('');
  lines.push('## Sections & Chords');

  // Group chords by section
  const chordsBySection = {};
  for (const chord of (chords || [])) {
    const sectionId = chord.sectionId || chord.section_id;
    if (!chordsBySection[sectionId]) chordsBySection[sectionId] = [];
    chordsBySection[sectionId].push(chord);
  }

  for (const section of sections) {
    const id = section.id;
    const tempo = section.tempoStart || section.tempo_start || song.bpmDefault || song.bpm_default || 120;
    const tempoEnd = section.tempoEnd || section.tempo_end;
    const ts = section.timeSignature || section.time_signature || song.timeSignatureDefault || song.time_signature_default || '4/4';
    const beatsPerBar = parseInt(ts.split('/')[0]) || 4;

    let tempoStr = `${tempo} BPM`;
    if (tempoEnd && tempoEnd !== tempo) {
      const curve = section.tempoCurve || section.tempo_curve || 'linear';
      tempoStr = `${tempo}→${tempoEnd} BPM (${curve})`;
    }

    lines.push('');
    lines.push(`### ${section.name} (${section.bars} bars, ${tempoStr}, ${ts})`);

    const sectionChords = chordsBySection[id] || [];
    lines.push(formatChordGrid(sectionChords, section.bars, beatsPerBar));
  }

  // Practice summary
  if (practiceHistory && practiceHistory.length > 0) {
    lines.push('');
    lines.push('## Practice History');

    const totalSessions = practiceHistory.length;
    let totalMinutes = 0;
    const sectionCounts = {};

    for (const session of practiceHistory) {
      if (session.startedAt && session.endedAt) {
        const start = new Date(session.startedAt || session.started_at).getTime();
        const end = new Date(session.endedAt || session.ended_at).getTime();
        totalMinutes += (end - start) / 60000;
      }

      const looped = session.settings?.loopedSectionName || session.settings?.looped_section_name;
      if (looped) {
        sectionCounts[looped] = (sectionCounts[looped] || 0) + 1;
      }
    }

    lines.push(`Total Sessions: ${totalSessions}`);
    lines.push(`Total Practice Time: ${Math.round(totalMinutes)} minutes`);

    if (Object.keys(sectionCounts).length > 0) {
      lines.push('Most Practiced Sections:');
      const sorted = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1]);
      for (const [name, count] of sorted.slice(0, 5)) {
        lines.push(`  - ${name}: ${count} sessions`);
      }
    }

    // Recent sessions (last 5)
    const recent = practiceHistory.slice(0, 5);
    lines.push('Recent Sessions:');
    for (const session of recent) {
      const date = new Date(session.startedAt || session.started_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const tempoOverride = session.settings?.tempoOverride || session.settings?.tempo_override;
      const autoRamp = session.settings?.autoRampEnabled || session.settings?.auto_ramp_enabled;
      let detail = dateStr;
      if (tempoOverride) detail += `, ${tempoOverride} BPM`;
      if (autoRamp) detail += ', auto-ramp';
      if (session.notes) detail += ` — "${session.notes}"`;
      lines.push(`  - ${detail}`);
    }
  }

  return lines.join('\n');
}

module.exports = { buildMetMapContext, formatChordGrid };
