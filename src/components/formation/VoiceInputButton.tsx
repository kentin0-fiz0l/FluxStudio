/**
 * VoiceInputButton - Microphone toggle button with recording state visualization
 *
 * Uses Web Speech API via VoiceInputController. Shows pulsing indicator
 * while recording, interim transcript tooltip, and auto-stops after 2s silence.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  VoiceInputController,
  isVoiceInputSupported,
  type VoiceInputCallbacks,
} from '@/services/voiceInput';

// ============================================================================
// Types
// ============================================================================

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing';

// ============================================================================
// Component
// ============================================================================

export function VoiceInputButton({ onTranscript, className = '' }: VoiceInputButtonProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<VoiceInputController | null>(null);

  const supported = isVoiceInputSupported();

  const callbacks: VoiceInputCallbacks = {
    onInterimResult: (text) => {
      setInterimText(text);
    },
    onFinalResult: (text) => {
      setInterimText('');
      onTranscript(text);
    },
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    },
    onStateChange: (newState) => {
      setState(newState);
      if (newState === 'idle') {
        setInterimText('');
      }
    },
  };

  // Stable ref for callbacks to avoid recreating controller
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleToggle = useCallback(() => {
    if (!supported) return;

    if (state === 'idle') {
      setError(null);
      const controller = new VoiceInputController({
        onInterimResult: (t) => callbacksRef.current.onInterimResult(t),
        onFinalResult: (t) => callbacksRef.current.onFinalResult(t),
        onError: (e) => callbacksRef.current.onError(e),
        onStateChange: (s) => callbacksRef.current.onStateChange(s),
      });
      controllerRef.current = controller;
      controller.start();
    } else {
      controllerRef.current?.stop();
      controllerRef.current = null;
    }
  }, [state, supported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, []);

  const isRecording = state === 'listening';
  const isProcessing = state === 'processing';

  if (!supported) {
    return (
      <button
        disabled
        className={`p-1.5 rounded-lg text-gray-300 dark:text-gray-600 cursor-not-allowed ${className}`}
        title="Voice input not available in this browser"
        aria-label="Voice input not available"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Interim transcript tooltip */}
      {interimText && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-[10px] rounded-lg shadow-lg max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {interimText}
        </div>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-[10px] rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          {error}
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isProcessing}
        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${className} ${
          isRecording
            ? 'bg-red-500 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.3)] animate-pulse'
            : isProcessing
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-wait'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        aria-pressed={isRecording}
      >
        {isRecording ? (
          <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <Mic className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export default VoiceInputButton;
