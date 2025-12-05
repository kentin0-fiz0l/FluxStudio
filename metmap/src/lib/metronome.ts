/**
 * MetMap Metronome Engine
 *
 * A high-precision metronome using the Web Audio API.
 * Features:
 * - Sample-accurate timing using AudioContext scheduling
 * - Support for tempo changes (instant, ramp, step)
 * - Time signature support with accented downbeats
 * - Count-in functionality
 * - Loop-aware scheduling
 *
 * Architecture:
 * The metronome uses a "look-ahead" scheduling approach:
 * 1. A JavaScript timer runs at ~25ms intervals (scheduler)
 * 2. The scheduler looks ahead 100ms and schedules any beats in that window
 * 3. Web Audio API handles precise timing of scheduled sounds
 * This decouples the UI thread timing (imprecise) from audio timing (precise).
 */

import {
  Song,
  TimeSignature,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_BPM,
  getTempoAtTime,
} from '@/types/metmap';

/** Metronome state */
export interface MetronomeState {
  isPlaying: boolean;
  currentBpm: number;
  currentTimeSignature: TimeSignature;
  currentBeat: number; // 1-indexed beat within measure
  currentMeasure: number;
  currentTime: number; // Playback position in seconds
}

/** Options for the metronome */
export interface MetronomeOptions {
  /** Callback when state changes */
  onStateChange?: (state: MetronomeState) => void;
  /** Callback on each beat (for visual sync) */
  onBeat?: (beat: number, measure: number, isDownbeat: boolean) => void;
  /** High frequency for downbeat click (Hz) */
  downbeatFrequency?: number;
  /** Low frequency for other beats (Hz) */
  beatFrequency?: number;
  /** Click duration in seconds */
  clickDuration?: number;
  /** Master volume (0-1) */
  volume?: number;
}

const DEFAULT_OPTIONS: Required<MetronomeOptions> = {
  onStateChange: () => {},
  onBeat: () => {},
  downbeatFrequency: 1000, // Higher pitch for downbeat
  beatFrequency: 800, // Lower pitch for other beats
  clickDuration: 0.05, // 50ms click
  volume: 0.7,
};

/**
 * Metronome Engine class
 */
export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private options: Required<MetronomeOptions>;

  // Scheduling state
  private schedulerTimer: number | null = null;
  private readonly scheduleAheadTime = 0.1; // Schedule 100ms ahead
  private readonly schedulerInterval = 25; // Check every 25ms

  // Playback state
  private isPlaying = false;
  private startTime = 0; // AudioContext time when playback started
  private pauseTime = 0; // Song position when paused
  private nextBeatTime = 0; // When the next beat should play
  private currentBeat = 1;
  private currentMeasure = 1;

  // Song reference
  private song: Song | null = null;
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  // Count-in state
  private countInBeats = 0;
  private countInRemaining = 0;

  constructor(options: MetronomeOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.options.volume;
    this.masterGain.connect(this.audioContext.destination);

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Set the song to use for tempo map
   */
  setSong(song: Song): void {
    this.song = song;
  }

  /**
   * Set loop boundaries (in seconds)
   */
  setLoop(start: number | null, end: number | null): void {
    this.loopStart = start;
    this.loopEnd = end;
  }

  /**
   * Set count-in beats (0 to disable)
   */
  setCountIn(beats: number): void {
    this.countInBeats = beats;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.options.volume;
    }
  }

  /**
   * Get current tempo and time signature at a given time
   */
  private getTempoAt(time: number): { bpm: number; timeSignature: TimeSignature } {
    if (!this.song) {
      return { bpm: DEFAULT_BPM, timeSignature: DEFAULT_TIME_SIGNATURE };
    }
    return getTempoAtTime(this.song, time);
  }

  /**
   * Calculate beat duration at a given time
   */
  private getBeatDuration(time: number): number {
    const { bpm } = this.getTempoAt(time);
    return 60 / bpm;
  }

  /**
   * Get current song time based on audio context time
   */
  private getCurrentSongTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return this.pauseTime + (this.audioContext.currentTime - this.startTime);
  }

  /**
   * Schedule a click sound
   */
  private scheduleClick(time: number, isDownbeat: boolean): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Set frequency based on beat type
    osc.frequency.value = isDownbeat
      ? this.options.downbeatFrequency
      : this.options.beatFrequency;

    // Sharp attack, quick decay envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + this.options.clickDuration);

    osc.start(time);
    osc.stop(time + this.options.clickDuration);
  }

  /**
   * The main scheduler - runs periodically and schedules upcoming beats
   */
  private scheduler = (): void => {
    if (!this.audioContext || !this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;

    // Schedule all beats that fall within the look-ahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      // Handle count-in
      if (this.countInRemaining > 0) {
        const isDownbeat = this.countInRemaining === this.countInBeats;
        this.scheduleClick(this.nextBeatTime, isDownbeat);

        // Notify UI
        this.options.onBeat(
          this.countInBeats - this.countInRemaining + 1,
          0, // Measure 0 indicates count-in
          isDownbeat
        );

        this.countInRemaining--;
        const { bpm } = this.getTempoAt(this.pauseTime);
        this.nextBeatTime += 60 / bpm;

        if (this.countInRemaining === 0) {
          // Count-in finished, start actual playback
          this.currentBeat = 1;
          this.currentMeasure = 1;
        }
        continue;
      }

      // Calculate song position for this beat
      const songTime = this.pauseTime + (this.nextBeatTime - this.startTime);

      // Check loop boundary
      if (this.loopEnd !== null && songTime >= this.loopEnd) {
        if (this.loopStart !== null) {
          // Jump back to loop start
          const overshoot = songTime - this.loopEnd;
          this.pauseTime = this.loopStart + overshoot;
          this.startTime = this.audioContext.currentTime;
          this.nextBeatTime = this.startTime;
          this.currentBeat = 1;
          this.currentMeasure = 1;
          continue;
        }
      }

      // Get tempo at this point
      const { bpm, timeSignature } = this.getTempoAt(songTime);
      const isDownbeat = this.currentBeat === 1;

      // Schedule the click
      this.scheduleClick(this.nextBeatTime, isDownbeat);

      // Notify UI
      this.options.onBeat(this.currentBeat, this.currentMeasure, isDownbeat);

      // Update state
      this.emitState(bpm, timeSignature, songTime);

      // Advance to next beat
      this.currentBeat++;
      if (this.currentBeat > timeSignature.beats) {
        this.currentBeat = 1;
        this.currentMeasure++;
      }

      // Calculate next beat time (may change if tempo varies)
      const nextSongTime = songTime + 60 / bpm;
      const nextTempo = this.getTempoAt(nextSongTime);
      this.nextBeatTime += 60 / bpm;

      // If there's a tempo ramp, adjust timing
      if (nextTempo.bpm !== bpm) {
        // Recalculate based on average tempo during transition
        const avgBpm = (bpm + nextTempo.bpm) / 2;
        this.nextBeatTime = this.nextBeatTime - (60 / bpm) + (60 / avgBpm);
      }
    }
  };

  /**
   * Emit current state to listeners
   */
  private emitState(bpm: number, timeSignature: TimeSignature, songTime: number): void {
    this.options.onStateChange({
      isPlaying: this.isPlaying,
      currentBpm: bpm,
      currentTimeSignature: timeSignature,
      currentBeat: this.currentBeat,
      currentMeasure: this.currentMeasure,
      currentTime: songTime,
    });
  }

  /**
   * Start playback
   */
  async start(fromTime = 0): Promise<void> {
    await this.init();
    if (!this.audioContext) return;

    this.isPlaying = true;
    this.pauseTime = fromTime;
    this.startTime = this.audioContext.currentTime;
    this.nextBeatTime = this.startTime;
    this.currentBeat = 1;
    this.currentMeasure = 1;

    // Set up count-in if configured
    this.countInRemaining = this.countInBeats;

    // Start scheduler
    this.schedulerTimer = window.setInterval(this.scheduler, this.schedulerInterval);
    this.scheduler(); // Run immediately

    const { bpm, timeSignature } = this.getTempoAt(fromTime);
    this.emitState(bpm, timeSignature, fromTime);
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false;
    this.pauseTime = this.getCurrentSongTime();

    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    const { bpm, timeSignature } = this.getTempoAt(this.pauseTime);
    this.emitState(bpm, timeSignature, this.pauseTime);
  }

  /**
   * Pause playback (same as stop but preserves position)
   */
  pause(): void {
    this.stop();
  }

  /**
   * Resume from paused position
   */
  async resume(): Promise<void> {
    await this.start(this.pauseTime);
  }

  /**
   * Toggle play/pause
   */
  async toggle(): Promise<void> {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.resume();
    }
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.pauseTime = Math.max(0, time);
    this.currentBeat = 1;
    this.currentMeasure = 1;

    const { bpm, timeSignature } = this.getTempoAt(this.pauseTime);
    this.emitState(bpm, timeSignature, this.pauseTime);

    if (wasPlaying) {
      this.start(this.pauseTime);
    }
  }

  /**
   * Get current playback state
   */
  getState(): MetronomeState {
    const songTime = this.getCurrentSongTime();
    const { bpm, timeSignature } = this.getTempoAt(songTime);

    return {
      isPlaying: this.isPlaying,
      currentBpm: bpm,
      currentTimeSignature: timeSignature,
      currentBeat: this.currentBeat,
      currentMeasure: this.currentMeasure,
      currentTime: songTime,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGain = null;
  }
}

/**
 * Tap tempo calculator
 * Calculates BPM from a series of taps
 */
export class TapTempo {
  private taps: number[] = [];
  private readonly maxTaps = 8; // Keep last N taps
  private readonly maxInterval = 2000; // Reset after 2 seconds of no taps

  /**
   * Record a tap and return the calculated BPM
   */
  tap(): number | null {
    const now = Date.now();

    // Reset if too long since last tap
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > this.maxInterval) {
      this.taps = [];
    }

    this.taps.push(now);

    // Keep only recent taps
    if (this.taps.length > this.maxTaps) {
      this.taps.shift();
    }

    // Need at least 2 taps to calculate
    if (this.taps.length < 2) {
      return null;
    }

    // Calculate average interval
    let totalInterval = 0;
    for (let i = 1; i < this.taps.length; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgInterval = totalInterval / (this.taps.length - 1);

    // Convert to BPM
    const bpm = Math.round(60000 / avgInterval);

    // Clamp to reasonable range
    return Math.max(20, Math.min(400, bpm));
  }

  /**
   * Reset tap history
   */
  reset(): void {
    this.taps = [];
  }
}

/**
 * Create a singleton metronome instance
 */
let metronomeInstance: MetronomeEngine | null = null;

export function getMetronome(options?: MetronomeOptions): MetronomeEngine {
  if (!metronomeInstance) {
    metronomeInstance = new MetronomeEngine(options);
  } else if (options) {
    // Update options on existing instance
    Object.assign(metronomeInstance['options'], options);
  }
  return metronomeInstance;
}
