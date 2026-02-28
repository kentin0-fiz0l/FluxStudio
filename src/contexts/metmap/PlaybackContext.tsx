/* eslint-disable react-refresh/only-export-components */
/**
 * Playback Context - FluxStudio
 *
 * Timer-based playback engine for MetMap with dual-source support:
 * - 'metronome' mode: existing setTimeout tick loop (no audio file needed)
 * - 'audio' mode: driven by an external audio clock (wavesurfer/AudioContext)
 * - 'both' mode: audio plays while metronome clicks overlay
 *
 * The engine always ticks through sections using the tempo map.
 * When an audio file is present and mode includes audio, the
 * `currentTimeSeconds` field is also updated for waveform sync.
 */

import * as React from 'react';
import { useNotification } from '../../store/slices/notificationSlice';
import { useMetMapCore } from './MetMapCoreContext';
import type { PlaybackContextValue, PlaybackMode, Section } from './types';
import { getBeatsPerBar, calculateGlobalBeat, secondsToGlobalBeat, globalBeatToSeconds } from './types';

const PlaybackContext = React.createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const { showNotification } = useNotification();
  const { state, dispatch } = useMetMapCore();

  // Refs for playback
  const playbackIntervalRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStartTimeRef = React.useRef<number>(0);

  const calculateTotalBeats = React.useCallback((sections: Section[]): number => {
    return sections.reduce((total, section) => {
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      return total + section.bars * beatsPerBar;
    }, 0);
  }, []);

  const getTempoAtBeat = React.useCallback((sections: Section[], globalBeat: number): { tempo: number; sectionIndex: number; sectionId?: string } => {
    let beatCount = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      const sectionBeats = section.bars * beatsPerBar;

      if (globalBeat < beatCount + sectionBeats) {
        const beatInSection = globalBeat - beatCount;
        const progress = beatInSection / sectionBeats;

        let tempo = section.tempoStart;
        if (section.tempoEnd && section.tempoEnd !== section.tempoStart) {
          if (section.tempoCurve === 'step') {
            tempo = section.tempoStart;
          } else if (section.tempoCurve === 'exponential') {
            tempo = section.tempoStart * Math.pow(section.tempoEnd / section.tempoStart, progress);
          } else {
            tempo = section.tempoStart + (section.tempoEnd - section.tempoStart) * progress;
          }
        }

        return { tempo: Math.round(tempo), sectionIndex: i, sectionId: section.id };
      }

      beatCount += sectionBeats;
    }

    const lastSection = sections[sections.length - 1];
    return {
      tempo: lastSection?.tempoEnd || lastSection?.tempoStart || 120,
      sectionIndex: sections.length - 1,
      sectionId: lastSection?.id
    };
  }, []);

  const getBarAndBeatAtGlobalBeat = React.useCallback((sections: Section[], globalBeat: number): { bar: number; beat: number } => {
    let beatCount = 0;
    let barCount = 0;

    for (const section of sections) {
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      const sectionBeats = section.bars * beatsPerBar;

      if (globalBeat < beatCount + sectionBeats) {
        const beatInSection = globalBeat - beatCount;
        const barInSection = Math.floor(beatInSection / beatsPerBar);
        const beat = (beatInSection % beatsPerBar) + 1;
        return { bar: barCount + barInSection + 1, beat };
      }

      beatCount += sectionBeats;
      barCount += section.bars;
    }

    return { bar: barCount, beat: 1 };
  }, []);

  const stop = React.useCallback(() => {
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    dispatch({ type: 'RESET_PLAYBACK' });
  }, [dispatch]);

  const play = React.useCallback((options?: { tempoOverride?: number; countoffBars?: number; loopSection?: number | null }) => {
    if (state.editedSections.length === 0) {
      showNotification({ type: 'warning', title: 'No Sections', message: 'Add sections to play' });
      return;
    }

    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
    }

    const tempoOverride = options?.tempoOverride;
    const countoffBars = options?.countoffBars || 0;
    const loopSectionIndex = options?.loopSection ?? null;

    let loopStartBeat = 0;
    let loopEndBeat = calculateTotalBeats(state.editedSections);

    if (loopSectionIndex !== null && loopSectionIndex >= 0 && loopSectionIndex < state.editedSections.length) {
      for (let i = 0; i < loopSectionIndex; i++) {
        const section = state.editedSections[i];
        const beatsPerBar = getBeatsPerBar(section.timeSignature);
        loopStartBeat += section.bars * beatsPerBar;
      }
      const loopSection = state.editedSections[loopSectionIndex];
      const loopBeatsPerBar = getBeatsPerBar(loopSection.timeSignature);
      loopEndBeat = loopStartBeat + loopSection.bars * loopBeatsPerBar;
    }

    const beatsPerBar = getBeatsPerBar(state.editedSections[0]?.timeSignature || '4/4');
    const countoffBeats = countoffBars * beatsPerBar;

    let globalBeat = state.playback.isPaused
      ? calculateGlobalBeat(state.editedSections, state.playback.currentBar, state.playback.currentBeat)
      : (loopSectionIndex !== null ? loopStartBeat : 0);

    let countoffRemaining = state.playback.isPaused ? 0 : countoffBeats;

    playbackStartTimeRef.current = Date.now();

    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: {
        isPlaying: true,
        isPaused: false,
        countingOff: countoffRemaining > 0,
        countoffBeatsRemaining: countoffRemaining
      }
    });

    const tick = () => {
      const { tempo, sectionIndex, sectionId } = getTempoAtBeat(state.editedSections, globalBeat);
      const currentTempo = tempoOverride || tempo;
      const msPerBeat = 60000 / currentTempo;

      if (countoffRemaining > 0) {
        countoffRemaining--;
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            countingOff: countoffRemaining > 0,
            countoffBeatsRemaining: countoffRemaining,
            currentTempo
          }
        });
      } else {
        const { bar, beat } = getBarAndBeatAtGlobalBeat(state.editedSections, globalBeat);
        const currentTimeSeconds = globalBeatToSeconds(state.editedSections, globalBeat);
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            currentBar: bar,
            currentBeat: beat,
            currentTempo,
            currentSectionId: sectionId,
            currentSectionIndex: sectionIndex,
            elapsedMs: Date.now() - playbackStartTimeRef.current,
            currentTimeSeconds,
          }
        });

        globalBeat++;

        if (loopSectionIndex !== null && globalBeat >= loopEndBeat) {
          globalBeat = loopStartBeat;
        } else if (globalBeat >= calculateTotalBeats(state.editedSections)) {
          stop();
          return;
        }
      }

      playbackIntervalRef.current = setTimeout(tick, msPerBeat);
    };

    tick();
  }, [state.editedSections, state.playback, getTempoAtBeat, getBarAndBeatAtGlobalBeat, calculateTotalBeats, showNotification, dispatch, stop]);

  const pause = React.useCallback(() => {
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: { isPlaying: false, isPaused: true }
    });
  }, [dispatch]);

  const seekToBar = React.useCallback((bar: number) => {
    const wasPlaying = state.playback.isPlaying;
    if (wasPlaying) pause();

    let currentBar = 1;
    for (let i = 0; i < state.editedSections.length; i++) {
      const section = state.editedSections[i];
      if (bar < currentBar + section.bars) {
        const globalBeat = calculateGlobalBeat(state.editedSections, bar, 1);
        const timeSeconds = globalBeatToSeconds(state.editedSections, globalBeat);
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            currentBar: bar,
            currentBeat: 1,
            currentSectionIndex: i,
            currentSectionId: section.id,
            currentTempo: section.tempoStart,
            currentTimeSeconds: timeSeconds,
          }
        });
        break;
      }
      currentBar += section.bars;
    }

    if (wasPlaying) play();
  }, [state.playback.isPlaying, state.editedSections, pause, play, dispatch]);

  const seekToTime = React.useCallback((seconds: number) => {
    const globalBeat = Math.floor(secondsToGlobalBeat(state.editedSections, seconds));
    const { bar, beat } = getBarAndBeatAtGlobalBeat(state.editedSections, globalBeat);
    const { tempo, sectionIndex, sectionId } = getTempoAtBeat(state.editedSections, globalBeat);

    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: {
        currentBar: bar,
        currentBeat: beat,
        currentTempo: tempo,
        currentSectionIndex: sectionIndex,
        currentSectionId: sectionId,
        currentTimeSeconds: seconds,
      }
    });
  }, [state.editedSections, getBarAndBeatAtGlobalBeat, getTempoAtBeat, dispatch]);

  const setPlaybackMode = React.useCallback((mode: PlaybackMode) => {
    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: { playbackMode: mode }
    });
  }, [dispatch]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current);
      }
    };
  }, []);

  const value: PlaybackContextValue = {
    play,
    pause,
    stop,
    seekToBar,
    seekToTime,
    setPlaybackMode,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = React.useContext(PlaybackContext);

  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }

  return context;
}

export default PlaybackContext;
