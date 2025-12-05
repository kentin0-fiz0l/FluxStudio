'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Check,
  Clock,
  Zap,
} from 'lucide-react';
import { useMetMapStore } from '@/stores/useMetMapStore';
import {
  ConfidenceLevel,
  SECTION_COLORS,
  formatTime,
  getSectionsNeedingPractice,
} from '@/types/metmap';
import { MetronomeControls } from '@/components/MetronomeControls';
import { clsx } from 'clsx';

export default function PracticeModePage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const song = useMetMapStore((state) => state.getSong(songId));
  const updateSectionConfidence = useMetMapStore(
    (state) => state.updateSectionConfidence
  );
  const startPracticeSession = useMetMapStore(
    (state) => state.startPracticeSession
  );
  const endPracticeSession = useMetMapStore((state) => state.endPracticeSession);
  const recordSectionPractice = useMetMapStore(
    (state) => state.recordSectionPractice
  );
  const preferences = useMetMapStore((state) => state.preferences);

  // Practice session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLooping, setIsLooping] = useState(preferences.autoLoop);
  const [isPaused, setIsPaused] = useState(true);
  const [practiceTime, setPracticeTime] = useState(0);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);

  // Simulated playback state (in real app, this would connect to audio player)
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start session on mount
  useEffect(() => {
    if (song && !sessionId) {
      const session = startPracticeSession(songId);
      setSessionId(session.id);
    }
  }, [song, songId, sessionId, startPracticeSession]);

  // Practice timer
  useEffect(() => {
    practiceTimerRef.current = setInterval(() => {
      setPracticeTime((t) => t + 1);
    }, 1000);

    return () => {
      if (practiceTimerRef.current) {
        clearInterval(practiceTimerRef.current);
      }
    };
  }, []);

  // Simulated playback
  useEffect(() => {
    if (!isPaused && song && song.sections.length > 0) {
      const section = song.sections[currentSectionIndex];

      timerRef.current = setInterval(() => {
        setCurrentTime((time) => {
          const newTime = time + 0.1;

          // Check if we've reached the end of the section
          if (newTime >= section.endTime) {
            if (isLooping) {
              // Loop back to start of section
              return section.startTime;
            } else {
              // Move to next section or pause
              if (currentSectionIndex < song.sections.length - 1) {
                setCurrentSectionIndex((i) => i + 1);
                return song.sections[currentSectionIndex + 1].startTime;
              } else {
                setIsPaused(true);
                return section.endTime;
              }
            }
          }

          return newTime;
        });
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, song, currentSectionIndex, isLooping]);

  // Jump to section start when section changes
  useEffect(() => {
    if (song && song.sections.length > 0) {
      setCurrentTime(song.sections[currentSectionIndex].startTime);
    }
  }, [currentSectionIndex, song]);

  const handleEndSession = (notes?: string, rating?: ConfidenceLevel) => {
    if (sessionId) {
      endPracticeSession(sessionId, notes, rating);
    }
    router.push(`/song/${songId}`);
  };

  const handleSectionComplete = () => {
    if (sessionId && song) {
      const section = song.sections[currentSectionIndex];
      recordSectionPractice(sessionId, section.id);
    }
  };

  const handleConfidenceChange = (level: ConfidenceLevel) => {
    if (song) {
      const section = song.sections[currentSectionIndex];
      updateSectionConfidence(songId, section.id, level);
    }
  };

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Song not found</p>
      </div>
    );
  }

  if (song.sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This song has no sections yet. Add sections before practicing.
        </p>
        <Link
          href={`/song/${songId}`}
          className="text-metmap-500 hover:text-metmap-600 font-medium"
        >
          Go back to add sections
        </Link>
      </div>
    );
  }

  const currentSection = song.sections[currentSectionIndex];
  const weakSections = getSectionsNeedingPractice(song);
  const sectionProgress =
    ((currentTime - currentSection.startTime) /
      (currentSection.endTime - currentSection.startTime)) *
    100;

  return (
    <main className="flex-1 flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => setShowEndSessionModal(true)}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">End</span>
        </button>

        <div className="text-center">
          <h1 className="font-semibold truncate max-w-[200px]">{song.title}</h1>
          <p className="text-xs text-gray-400">{song.artist}</p>
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          {formatTime(practiceTime)}
        </div>
      </header>

      {/* Current Section Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Section indicator */}
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center mb-6"
          style={{
            backgroundColor: currentSection.color || SECTION_COLORS[currentSection.type],
          }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold">
              {currentSectionIndex + 1}/{song.sections.length}
            </div>
          </div>
        </div>

        {/* Section name and time */}
        <h2 className="text-2xl font-bold mb-2">{currentSection.name}</h2>
        <p className="text-gray-400 mb-6">
          {formatTime(currentSection.startTime)} - {formatTime(currentSection.endTime)}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-8">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-metmap-500 transition-all duration-100"
              style={{ width: `${Math.min(100, Math.max(0, sectionProgress))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentSection.endTime)}</span>
          </div>
        </div>

        {/* Confidence selector */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 text-center mb-3">
            How confident are you with this section?
          </p>
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleConfidenceChange(level)}
                className={clsx(
                  'w-12 h-12 rounded-full text-lg font-bold transition-all tap-target',
                  level <= currentSection.confidence
                    ? 'bg-metmap-500 text-white scale-110'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        {currentSection.notes && (
          <div className="w-full max-w-sm p-4 bg-gray-800 rounded-xl mb-6">
            <p className="text-sm text-gray-300">{currentSection.notes}</p>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="p-4 border-t border-gray-800">
        {/* Section navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setCurrentSectionIndex((i) => Math.max(0, i - 1))}
            disabled={currentSectionIndex === 0}
            className="p-3 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed tap-target"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-16 h-16 rounded-full bg-metmap-500 hover:bg-metmap-600 flex items-center justify-center tap-target"
          >
            {isPaused ? (
              <Play className="w-8 h-8 ml-1" />
            ) : (
              <Pause className="w-8 h-8" />
            )}
          </button>

          <button
            onClick={() =>
              setCurrentSectionIndex((i) =>
                Math.min(song.sections.length - 1, i + 1)
              )
            }
            disabled={currentSectionIndex === song.sections.length - 1}
            className="p-3 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed tap-target"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Loop toggle and mark complete */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg tap-target',
              isLooping
                ? 'bg-metmap-500/20 text-metmap-400'
                : 'text-gray-400 hover:bg-gray-800'
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-sm">Loop</span>
          </button>

          <button
            onClick={handleSectionComplete}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg tap-target"
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Mark Done</span>
          </button>
        </div>
      </div>

      {/* Metronome Controls */}
      <div className="px-4 pb-4">
        <MetronomeControls
          song={song}
          loopStart={isLooping ? currentSection.startTime : null}
          loopEnd={isLooping ? currentSection.endTime : null}
          countInBars={preferences.countInBeats > 0 ? 1 : 0}
        />
      </div>

      {/* Section Quick Nav */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {song.sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentSectionIndex(index)}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                index === currentSectionIndex
                  ? 'bg-metmap-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* Weak Sections Suggestion */}
      {weakSections.length > 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
              <Zap className="w-4 h-4" />
              <span className="font-medium">Focus Areas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakSections.map((section) => {
                const index = song.sections.findIndex((s) => s.id === section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSectionIndex(index)}
                    className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30"
                  >
                    {section.name} ({section.confidence}/5)
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndSessionModal && (
        <EndSessionModal
          practiceTime={practiceTime}
          onEnd={handleEndSession}
          onCancel={() => setShowEndSessionModal(false)}
        />
      )}
    </main>
  );
}

function EndSessionModal({
  practiceTime,
  onEnd,
  onCancel,
}: {
  practiceTime: number;
  onEnd: (notes?: string, rating?: ConfidenceLevel) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<ConfidenceLevel | undefined>();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-gray-800 rounded-t-2xl sm:rounded-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">End Practice Session</h2>
          <p className="text-gray-400 mb-6">
            You practiced for {formatTime(practiceTime)}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                How did it go?
              </label>
              <div className="flex items-center gap-2">
                {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setRating(level)}
                    className={clsx(
                      'flex-1 py-3 rounded-lg font-bold transition-all',
                      rating === level
                        ? 'bg-metmap-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Session notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you work on? Any breakthroughs?"
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-metmap-500 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-400 hover:bg-gray-700 rounded-lg font-medium"
          >
            Keep Practicing
          </button>
          <button
            onClick={() => onEnd(notes || undefined, rating)}
            className="flex-1 px-4 py-3 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg font-medium"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
