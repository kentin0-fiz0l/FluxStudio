/**
 * Voice Input Service - Web Speech API wrapper for voice-driven formation commands
 *
 * Provides push-to-talk recording with silence detection, filler word removal,
 * and drill vocabulary normalization.
 */

// ============================================================================
// Web Speech API Type Declarations (not in all TypeScript lib targets)
// ============================================================================

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// ============================================================================
// Types
// ============================================================================

export interface VoiceInputCallbacks {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (state: 'idle' | 'listening' | 'processing') => void;
}

// ============================================================================
// Browser Compatibility
// ============================================================================

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ??
    null
  );
}

export function isVoiceInputSupported(): boolean {
  return getSpeechRecognitionClass() !== null;
}

// ============================================================================
// Filler Word & Vocabulary Normalization
// ============================================================================

const FILLER_WORDS = /\b(um|uh|like|you know|basically|actually|so|well|right|okay)\b/gi;

const DRILL_NORMALIZATIONS: [RegExp, string][] = [
  [/\bcompany\s+front\b/gi, 'company front'],
  [/\bspread\b/gi, 'spread'],
  [/\bblock\s+formation\b/gi, 'block formation'],
  [/\bscatter\b/gi, 'scatter'],
  [/\bwedge\b/gi, 'wedge'],
  [/\bdiagonal\b/gi, 'diagonal'],
  [/\bcircle\b/gi, 'circle'],
  [/\barc\b/gi, 'arc'],
  [/\bgrid\b/gi, 'grid'],
  [/\bline\b/gi, 'line'],
];

function cleanTranscript(raw: string): string {
  // Remove filler words
  let cleaned = raw.replace(FILLER_WORDS, '').trim();

  // Normalize drill vocabulary (preserve casing from normalized form)
  for (const [pattern, replacement] of DRILL_NORMALIZATIONS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

// ============================================================================
// Voice Input Controller
// ============================================================================

const SILENCE_TIMEOUT_MS = 2000;

export class VoiceInputController {
  private recognition: SpeechRecognitionInstance | null = null;
  private callbacks: VoiceInputCallbacks;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private accumulatedText = '';
  private isRunning = false;

  constructor(callbacks: VoiceInputCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      this.callbacks.onError('Speech recognition is not supported in this browser');
      return;
    }

    if (this.isRunning) {
      this.stop();
      return;
    }

    this.accumulatedText = '';
    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.clearSilenceTimer();

      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalText) {
        this.accumulatedText += (this.accumulatedText ? ' ' : '') + finalText;
      }

      const currentInterim = this.accumulatedText + (interim ? ' ' + interim : '');
      this.callbacks.onInterimResult(cleanTranscript(currentInterim));

      // Start silence timer — if no new results for 2s, finalize
      this.silenceTimer = setTimeout(() => {
        this.finalize();
      }, SILENCE_TIMEOUT_MS);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // Not a real error, just silence
        return;
      }
      this.callbacks.onError(event.error);
      this.cleanup();
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        // If we're still supposed to be running but recognition ended,
        // finalize with what we have
        this.finalize();
      }
    };

    try {
      this.recognition.start();
      this.isRunning = true;
      this.callbacks.onStateChange('listening');
    } catch (_err) {
      this.callbacks.onError('Failed to start speech recognition');
      this.cleanup();
    }
  }

  stop(): void {
    this.finalize();
  }

  private finalize(): void {
    this.clearSilenceTimer();

    if (this.accumulatedText.trim()) {
      this.callbacks.onStateChange('processing');
      const cleaned = cleanTranscript(this.accumulatedText);
      if (cleaned) {
        this.callbacks.onFinalResult(cleaned);
      }
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.clearSilenceTimer();
    this.isRunning = false;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }

    this.accumulatedText = '';
    this.callbacks.onStateChange('idle');
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
