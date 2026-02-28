/**
 * VoiceRecorder Component
 *
 * Records audio using MediaRecorder API and returns the audio blob.
 * Shows recording timer, pulsing indicator, cancel and send buttons.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';

export interface VoiceRecorderProps {
  onSendVoice: (file: File) => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch {
      setError('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleSend = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        onSendVoice(file);
      };
      stopRecording();
    } else if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-message-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      onSendVoice(file);
    }
  }, [onSendVoice, stopRecording]);

  const handleCancel = useCallback(() => {
    stopRecording();
    chunksRef.current = [];
    onCancel();
  }, [stopRecording, onCancel]);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
        >
          <X className="w-4 h-4 text-neutral-500" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="flex-shrink-0 p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        title="Cancel recording"
      >
        <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
      </button>

      {/* Recording indicator */}
      <div className="flex-1 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {isRecording ? 'Recording' : 'Processing'}...
        </span>
        <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
          {formatDuration(duration)}
        </span>

        {/* Simple waveform visualization */}
        <div className="flex items-center gap-0.5 flex-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 dark:bg-red-500 rounded-full transition-all"
              style={{
                height: isRecording
                  ? `${Math.max(4, Math.random() * 20)}px`
                  : '4px',
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        className="flex-shrink-0 p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg"
        title="Send voice message"
      >
        <Send className="w-5 h-5 text-white" aria-hidden="true" />
      </button>
    </div>
  );
}

export default VoiceRecorder;
