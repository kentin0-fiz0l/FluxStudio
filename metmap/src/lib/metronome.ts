/**
 * Metronome Engine - Web Audio API based metronome with customizable sounds
 *
 * Uses a "look-ahead" scheduling approach for sample-accurate timing:
 * 1. JavaScript timer runs every ~25ms (scheduler)
 * 2. Scheduler looks 100ms ahead and schedules beats in that window
 * 3. Web Audio API handles precise timing of scheduled sounds
 */

export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface ClickSound {
  frequency: number;      // Hz (200-2000)
  waveform: Waveform;
  duration: number;       // ms (20-200)
  attack: number;         // ms (1-50)
  release: number;        // ms (10-150)
  volume: number;         // 0-1
}

export interface MetronomeConfig {
  tempo: number;                    // BPM (20-400)
  beatsPerMeasure: number;          // Time signature numerator (1-16)
  beatUnit: number;                 // Time signature denominator (1,2,4,8,16)
  accentPattern: number[];          // Volume multipliers per beat (0-1)
  clickSound: ClickSound;           // Normal beat sound
  accentSound: ClickSound;          // Accented beat sound
  subdivisions: number;             // 1=quarter, 2=eighth, 3=triplet, 4=sixteenth
}

export interface MetronomeState {
  isPlaying: boolean;
  currentBeat: number;              // 0-indexed beat in measure
  currentSubdivision: number;       // 0-indexed subdivision
  visualBeatTime: number | null;    // Timestamp for visual sync
}

export type MetronomeCallback = (state: MetronomeState) => void;

// Sound presets
export const SOUND_PRESETS: Record<string, { click: ClickSound; accent: ClickSound }> = {
  classic: {
    click: { frequency: 800, waveform: 'sine', duration: 50, attack: 2, release: 48, volume: 0.5 },
    accent: { frequency: 1000, waveform: 'sine', duration: 60, attack: 2, release: 58, volume: 0.7 },
  },
  wood: {
    click: { frequency: 1200, waveform: 'triangle', duration: 30, attack: 1, release: 29, volume: 0.6 },
    accent: { frequency: 1500, waveform: 'triangle', duration: 40, attack: 1, release: 39, volume: 0.8 },
  },
  electronic: {
    click: { frequency: 600, waveform: 'square', duration: 20, attack: 1, release: 19, volume: 0.4 },
    accent: { frequency: 900, waveform: 'square', duration: 25, attack: 1, release: 24, volume: 0.6 },
  },
  soft: {
    click: { frequency: 440, waveform: 'sine', duration: 80, attack: 10, release: 70, volume: 0.3 },
    accent: { frequency: 660, waveform: 'sine', duration: 100, attack: 10, release: 90, volume: 0.5 },
  },
  bright: {
    click: { frequency: 1800, waveform: 'sawtooth', duration: 25, attack: 1, release: 24, volume: 0.35 },
    accent: { frequency: 2200, waveform: 'sawtooth', duration: 30, attack: 1, release: 29, volume: 0.5 },
  },
};

export const DEFAULT_CONFIG: MetronomeConfig = {
  tempo: 120,
  beatsPerMeasure: 4,
  beatUnit: 4,
  accentPattern: [1, 0.5, 0.5, 0.5],  // Accent on beat 1
  clickSound: SOUND_PRESETS.classic.click,
  accentSound: SOUND_PRESETS.classic.accent,
  subdivisions: 1,
};

class Metronome {
  private audioContext: AudioContext | null = null;
  private config: MetronomeConfig = { ...DEFAULT_CONFIG };
  private isPlaying = false;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private currentBeat = 0;
  private currentSubdivision = 0;
  private callback: MetronomeCallback | null = null;

  // Scheduling constants
  private readonly SCHEDULE_AHEAD_TIME = 0.1;  // seconds to look ahead
  private readonly SCHEDULER_INTERVAL = 25;    // ms between scheduler runs

  constructor() {
    // AudioContext created on first play (user interaction required)
  }

  private initAudioContext(): boolean {
    if (this.audioContext) return true;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      return true;
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      return false;
    }
  }

  private playClick(time: number, sound: ClickSound, accentMultiplier: number): void {
    if (!this.audioContext) return;

    const volume = Math.min(1, Math.max(0, sound.volume * accentMultiplier));
    if (volume === 0) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = sound.waveform;
    oscillator.frequency.setValueAtTime(sound.frequency, time);

    // Attack-release envelope
    const attackTime = sound.attack / 1000;
    const duration = sound.duration / 1000;

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + attackTime);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  private scheduleBeats(): void {
    if (!this.audioContext || !this.isPlaying) return;

    const secondsPerBeat = 60 / this.config.tempo;
    const secondsPerSubdivision = secondsPerBeat / this.config.subdivisions;

    while (this.nextBeatTime < this.audioContext.currentTime + this.SCHEDULE_AHEAD_TIME) {
      // Determine if this is an accented beat
      const beatIndex = this.currentBeat % this.config.beatsPerMeasure;
      const accentMultiplier = this.config.accentPattern[beatIndex] ?? 0.5;

      // Select sound based on accent level
      const sound = accentMultiplier >= 0.8 ? this.config.accentSound : this.config.clickSound;

      // Only play on beat if subdivision is 0, otherwise play subdivision
      const shouldPlay = this.currentSubdivision === 0 || this.config.subdivisions > 1;
      const subdivisionVolume = this.currentSubdivision === 0 ? 1 : 0.5;

      if (shouldPlay) {
        this.playClick(this.nextBeatTime, sound, accentMultiplier * subdivisionVolume);
      }

      // Notify callback for visual sync
      if (this.callback) {
        const beatTime = this.nextBeatTime;
        const state: MetronomeState = {
          isPlaying: true,
          currentBeat: this.currentBeat,
          currentSubdivision: this.currentSubdivision,
          visualBeatTime: beatTime,
        };

        // Schedule callback slightly before audio to allow visual prep
        const delay = Math.max(0, (beatTime - this.audioContext.currentTime) * 1000 - 10);
        setTimeout(() => this.callback?.(state), delay);
      }

      // Advance to next subdivision
      this.nextBeatTime += secondsPerSubdivision;
      this.currentSubdivision++;

      if (this.currentSubdivision >= this.config.subdivisions) {
        this.currentSubdivision = 0;
        this.currentBeat++;

        if (this.currentBeat >= this.config.beatsPerMeasure) {
          this.currentBeat = 0;
        }
      }
    }
  }

  start(): boolean {
    if (this.isPlaying) return true;
    if (!this.initAudioContext()) return false;

    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentSubdivision = 0;
    this.nextBeatTime = this.audioContext!.currentTime + 0.05; // Small delay to start

    this.schedulerTimer = setInterval(() => this.scheduleBeats(), this.SCHEDULER_INTERVAL);

    if (this.callback) {
      this.callback({
        isPlaying: true,
        currentBeat: 0,
        currentSubdivision: 0,
        visualBeatTime: null,
      });
    }

    return true;
  }

  stop(): void {
    this.isPlaying = false;

    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    if (this.callback) {
      this.callback({
        isPlaying: false,
        currentBeat: 0,
        currentSubdivision: 0,
        visualBeatTime: null,
      });
    }
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  setConfig(config: Partial<MetronomeConfig>): void {
    this.config = { ...this.config, ...config };

    // Clamp tempo to valid range
    this.config.tempo = Math.min(400, Math.max(20, this.config.tempo));

    // Ensure accent pattern matches beats per measure
    if (this.config.accentPattern.length !== this.config.beatsPerMeasure) {
      this.config.accentPattern = Array(this.config.beatsPerMeasure)
        .fill(0.5)
        .map((v, i) => i === 0 ? 1 : v);
    }
  }

  getConfig(): MetronomeConfig {
    return { ...this.config };
  }

  setTempo(bpm: number): void {
    this.setConfig({ tempo: bpm });
  }

  setTimeSignature(beatsPerMeasure: number, beatUnit: number): void {
    const accentPattern = Array(beatsPerMeasure)
      .fill(0.5)
      .map((v, i) => i === 0 ? 1 : v);
    this.setConfig({ beatsPerMeasure, beatUnit, accentPattern });
  }

  setAccentPattern(pattern: number[]): void {
    this.setConfig({ accentPattern: pattern });
  }

  setSound(preset: keyof typeof SOUND_PRESETS): void {
    const sounds = SOUND_PRESETS[preset];
    if (sounds) {
      this.setConfig({
        clickSound: sounds.click,
        accentSound: sounds.accent,
      });
    }
  }

  setSubdivisions(subdivisions: number): void {
    this.setConfig({ subdivisions: Math.min(4, Math.max(1, subdivisions)) });
  }

  onBeat(callback: MetronomeCallback): void {
    this.callback = callback;
  }

  // Tap tempo helper
  private tapTimes: number[] = [];
  private readonly TAP_TIMEOUT = 2000; // Reset after 2s of no taps

  tap(): number | null {
    const now = Date.now();

    // Clear old taps
    this.tapTimes = this.tapTimes.filter(t => now - t < this.TAP_TIMEOUT);
    this.tapTimes.push(now);

    if (this.tapTimes.length < 2) return null;

    // Calculate average interval from last 8 taps
    const recentTaps = this.tapTimes.slice(-8);
    let totalInterval = 0;
    for (let i = 1; i < recentTaps.length; i++) {
      totalInterval += recentTaps[i] - recentTaps[i - 1];
    }
    const avgInterval = totalInterval / (recentTaps.length - 1);
    const bpm = Math.round(60000 / avgInterval);

    // Clamp to valid range
    const clampedBpm = Math.min(400, Math.max(20, bpm));
    this.setTempo(clampedBpm);

    return clampedBpm;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let metronomeInstance: Metronome | null = null;

export function getMetronome(): Metronome {
  if (!metronomeInstance) {
    metronomeInstance = new Metronome();
  }
  return metronomeInstance;
}

export function createMetronome(): Metronome {
  return new Metronome();
}
