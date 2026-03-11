/**
 * MIDI Parser - FluxStudio
 *
 * Parse Standard MIDI Files (SMF) to extract tempo maps and time signatures.
 * Converts MIDI tempo events to FluxStudio TempoMap format.
 *
 * Supports:
 * - SMF Format 0 (single track) and Format 1 (multiple tracks)
 * - Meta Event 0x51: Set Tempo
 * - Meta Event 0x58: Time Signature
 * - Variable-length delta time decoding
 */

import type { TempoMap, TempoMapSegment } from './tempoMap';

// ============================================================================
// TYPES
// ============================================================================

export interface MidiTempoEvent {
  /** Absolute tick position */
  tick: number;
  /** Microseconds per quarter note */
  microsecondsPerBeat: number;
  /** Beats per minute */
  bpm: number;
}

export interface MidiTimeSignatureEvent {
  /** Absolute tick position */
  tick: number;
  /** Beats per measure (numerator) */
  numerator: number;
  /** Beat value as power of 2 (denominator) — e.g., 4 = quarter note */
  denominator: number;
}

export interface MidiParseResult {
  tempoEvents: MidiTempoEvent[];
  timeSignatureEvents: MidiTimeSignatureEvent[];
  ticksPerQuarterNote: number;
  totalTicks: number;
  durationMs: number;
}

// ============================================================================
// BINARY READER
// ============================================================================

class MidiReader {
  private view: DataView;
  private pos: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get position(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.view.byteLength - this.pos;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.pos);
    this.pos += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.pos, false); // big-endian
    this.pos += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.pos, false); // big-endian
    this.pos += 4;
    return val;
  }

  readString(length: number): string {
    let s = '';
    for (let i = 0; i < length; i++) {
      s += String.fromCharCode(this.view.getUint8(this.pos + i));
    }
    this.pos += length;
    return s;
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, length);
    this.pos += length;
    return bytes;
  }

  /**
   * Read a MIDI variable-length quantity (VLQ).
   * Each byte uses 7 data bits + 1 continuation bit (MSB).
   */
  readVariableLength(): number {
    let value = 0;
    let byte: number;
    do {
      byte = this.readUint8();
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return value;
  }

  skip(length: number): void {
    this.pos += length;
  }

  seek(position: number): void {
    this.pos = position;
  }
}

// ============================================================================
// MIDI PARSER
// ============================================================================

/**
 * Parse a Standard MIDI File to extract tempo and time signature data.
 */
export function parseMidiFile(buffer: ArrayBuffer): MidiParseResult {
  const reader = new MidiReader(buffer);

  // --- Read Header Chunk (MThd) ---
  const headerMagic = reader.readString(4);
  if (headerMagic !== 'MThd') {
    throw new Error(`Invalid MIDI file: expected "MThd" header, got "${headerMagic}"`);
  }

  const headerLength = reader.readUint32(); // should be 6
  const format = reader.readUint16();       // 0, 1, or 2
  const numTracks = reader.readUint16();
  const division = reader.readUint16();

  // Skip any extra header bytes beyond the standard 6
  if (headerLength > 6) {
    reader.skip(headerLength - 6);
  }

  // We only support ticks-per-quarter-note division (bit 15 = 0)
  if (division & 0x8000) {
    throw new Error('SMPTE time division is not supported. Only ticks-per-quarter-note MIDI files are supported.');
  }

  const ticksPerQuarterNote = division;

  if (format > 2) {
    throw new Error(`Unsupported MIDI format: ${format}. Only formats 0, 1, and 2 are supported.`);
  }

  // --- Read Track Chunks ---
  const tempoEvents: MidiTempoEvent[] = [];
  const timeSignatureEvents: MidiTimeSignatureEvent[] = [];
  let totalTicks = 0;

  for (let t = 0; t < numTracks; t++) {
    if (reader.remaining < 8) break;

    const trackMagic = reader.readString(4);
    if (trackMagic !== 'MTrk') {
      throw new Error(`Invalid track chunk: expected "MTrk", got "${trackMagic}"`);
    }

    const trackLength = reader.readUint32();
    const trackEnd = reader.position + trackLength;
    let absoluteTick = 0;
    let runningStatus = 0;

    while (reader.position < trackEnd) {
      // Read delta time
      const deltaTime = reader.readVariableLength();
      absoluteTick += deltaTime;

      // Read event
      let statusByte = reader.readUint8();

      if (statusByte === 0xff) {
        // Meta Event
        const metaType = reader.readUint8();
        const metaLength = reader.readVariableLength();

        if (metaType === 0x51 && metaLength === 3) {
          // Set Tempo: 3 bytes = microseconds per quarter note
          const b1 = reader.readUint8();
          const b2 = reader.readUint8();
          const b3 = reader.readUint8();
          const microsecondsPerBeat = (b1 << 16) | (b2 << 8) | b3;
          const bpm = Math.round((60000000 / microsecondsPerBeat) * 100) / 100;

          tempoEvents.push({ tick: absoluteTick, microsecondsPerBeat, bpm });
        } else if (metaType === 0x58 && metaLength >= 2) {
          // Time Signature: nn dd cc bb
          const numerator = reader.readUint8();
          const denominatorPow = reader.readUint8();
          const denominator = Math.pow(2, denominatorPow);
          // Skip remaining bytes (clocks per metronome click, 32nd notes per quarter)
          if (metaLength > 2) reader.skip(metaLength - 2);

          timeSignatureEvents.push({ tick: absoluteTick, numerator, denominator });
        } else if (metaType === 0x2f) {
          // End of Track
          if (metaLength > 0) reader.skip(metaLength);
          if (absoluteTick > totalTicks) totalTicks = absoluteTick;
          break;
        } else {
          // Skip other meta events
          reader.skip(metaLength);
        }
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx Event
        const sysExLength = reader.readVariableLength();
        reader.skip(sysExLength);
      } else {
        // MIDI Channel Event
        if (statusByte & 0x80) {
          runningStatus = statusByte;
        } else {
          // Running status: the byte we read is actually the first data byte
          statusByte = runningStatus;
          // Need to "unread" by going back one byte for the data
          reader.seek(reader.position - 1);
        }

        const eventType = statusByte & 0xf0;
        // Read data bytes based on event type
        switch (eventType) {
          case 0x80: // Note Off
          case 0x90: // Note On
          case 0xa0: // Aftertouch
          case 0xb0: // Control Change
          case 0xe0: // Pitch Bend
            reader.skip(2);
            break;
          case 0xc0: // Program Change
          case 0xd0: // Channel Pressure
            reader.skip(1);
            break;
          default:
            // Unknown event, try to skip gracefully
            reader.skip(1);
            break;
        }
      }
    }

    if (absoluteTick > totalTicks) totalTicks = absoluteTick;

    // Ensure we're at the end of the track chunk
    if (reader.position < trackEnd) {
      reader.seek(trackEnd);
    }
  }

  // If no tempo event found, default to 120 BPM
  if (tempoEvents.length === 0) {
    tempoEvents.push({ tick: 0, microsecondsPerBeat: 500000, bpm: 120 });
  }

  // If no time signature found, default to 4/4
  if (timeSignatureEvents.length === 0) {
    timeSignatureEvents.push({ tick: 0, numerator: 4, denominator: 4 });
  }

  // Sort by tick
  tempoEvents.sort((a, b) => a.tick - b.tick);
  timeSignatureEvents.sort((a, b) => a.tick - b.tick);

  // Calculate total duration in milliseconds
  const durationMs = ticksToMs(totalTicks, tempoEvents, ticksPerQuarterNote);

  return {
    tempoEvents,
    timeSignatureEvents,
    ticksPerQuarterNote,
    totalTicks,
    durationMs,
  };
}

// ============================================================================
// CONVERSION TO TEMPO MAP
// ============================================================================

/**
 * Convert a MidiParseResult to a FluxStudio TempoMap.
 *
 * Each tempo change in the MIDI file becomes a new TempoMapSegment.
 * Count ranges are calculated from tick positions and tempo values.
 */
export function midiToTempoMap(midiResult: MidiParseResult): TempoMap {
  const { tempoEvents, timeSignatureEvents, ticksPerQuarterNote, totalTicks } = midiResult;

  if (tempoEvents.length === 0) {
    return { segments: [], totalCounts: 0, totalDurationMs: 0 };
  }

  // Build segments from tempo events
  const segments: TempoMapSegment[] = [];
  let currentCount = 1;
  let currentBar = 1;

  for (let i = 0; i < tempoEvents.length; i++) {
    const tempoEvent = tempoEvents[i];
    const nextTempoTick = i + 1 < tempoEvents.length ? tempoEvents[i + 1].tick : totalTicks;
    const segmentTicks = nextTempoTick - tempoEvent.tick;

    if (segmentTicks <= 0) continue;

    // Find the active time signature at this tick
    const timeSig = getTimeSignatureAtTick(tempoEvent.tick, timeSignatureEvents);
    const beatsPerBar = timeSig.numerator;

    // Calculate number of beats (counts) in this segment
    // Each beat = ticksPerQuarterNote ticks (for quarter note denominator)
    // For other denominators, adjust accordingly
    const ticksPerBeat = ticksPerQuarterNote * (4 / timeSig.denominator);
    const segmentBeats = Math.round(segmentTicks / ticksPerBeat);

    if (segmentBeats <= 0) continue;

    const bars = Math.ceil(segmentBeats / beatsPerBar);

    segments.push({
      startCount: currentCount,
      endCount: currentCount + segmentBeats - 1,
      tempoStart: tempoEvent.bpm,
      tempoEnd: tempoEvent.bpm, // constant within each MIDI tempo segment
      tempoCurve: 'step',
      beatsPerBar,
      startBar: currentBar,
      bars,
      sectionName: `Tempo ${Math.round(tempoEvent.bpm)} BPM`,
    });

    currentCount += segmentBeats;
    currentBar += bars;
  }

  // Calculate total duration
  const totalCounts = currentCount - 1;
  let totalDurationMs = 0;
  for (const seg of segments) {
    const segBeats = seg.endCount - seg.startCount + 1;
    totalDurationMs += segBeats * (60000 / seg.tempoStart);
  }

  return { segments, totalCounts, totalDurationMs };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert absolute ticks to milliseconds using tempo events.
 */
function ticksToMs(
  targetTick: number,
  tempoEvents: MidiTempoEvent[],
  ticksPerQuarterNote: number,
): number {
  let ms = 0;
  let currentTick = 0;
  let currentTempo = tempoEvents[0]?.microsecondsPerBeat ?? 500000; // default 120 BPM

  for (const event of tempoEvents) {
    if (event.tick > targetTick) break;

    if (event.tick > currentTick) {
      const deltaTicks = event.tick - currentTick;
      ms += (deltaTicks / ticksPerQuarterNote) * (currentTempo / 1000);
      currentTick = event.tick;
    }

    currentTempo = event.microsecondsPerBeat;
  }

  // Remaining ticks after last tempo event
  if (currentTick < targetTick) {
    const deltaTicks = targetTick - currentTick;
    ms += (deltaTicks / ticksPerQuarterNote) * (currentTempo / 1000);
  }

  return ms;
}

/**
 * Get the active time signature at a given tick position.
 */
function getTimeSignatureAtTick(
  tick: number,
  timeSignatureEvents: MidiTimeSignatureEvent[],
): MidiTimeSignatureEvent {
  let active = timeSignatureEvents[0] ?? { tick: 0, numerator: 4, denominator: 4 };

  for (const event of timeSignatureEvents) {
    if (event.tick <= tick) {
      active = event;
    } else {
      break;
    }
  }

  return active;
}
