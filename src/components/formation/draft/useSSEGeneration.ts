import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { buildApiUrl } from '@/config/environment';
import type { DraftStatus } from './formationDraftTypes';
import type { ShowPlan } from '@/store/slices/formationDraftSlice';

export function useSSEGeneration(formationId: string) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(async (params: {
    songId?: string | null;
    showDescription: string;
    performerCount: number;
    constraints?: Record<string, unknown>;
  }) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = useStore.getState().auth.token;
    if (!token) return;

    abortRef.current = new AbortController();

    try {
      const response = await fetch(buildApiUrl('/api/formation-agent/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          formationId,
          songId: params.songId || undefined,
          showDescription: params.showDescription,
          performerCount: params.performerCount,
          constraints: params.constraints || {},
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }));
        useStore.getState().formationDraft.setDraftError(errData.error || errData.message || 'Generation failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleSSEEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      useStore.getState().formationDraft.setDraftError(
        err instanceof Error ? err.message : 'Connection lost'
      );
    }
  }, [formationId]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, []);

  return { startGeneration, cancelGeneration };
}

function handleSSEEvent(event: { type: string; data: Record<string, unknown> }) {
  const { type, data } = event;
  const draft = useStore.getState().formationDraft;

  switch (type) {
    case 'session':
      draft.startDraftSession(data.sessionId as string);
      break;
    case 'status':
      draft.setDraftStatus(data.status as DraftStatus);
      break;
    case 'music_analysis':
      draft.setMusicAnalysis({
        sections: data.sections as { name: string; startMs: number; endMs: number; durationMs: number; tempo: number }[],
        totalDurationMs: data.totalDurationMs as number,
        hasSong: true,
      });
      break;
    case 'plan':
      draft.setShowPlan(data as unknown as ShowPlan);
      break;
    case 'awaiting_approval':
      draft.setDraftStatus('awaiting_approval');
      break;
    case 'generating':
      draft.setGenerationProgress(
        data.sectionIndex as number,
        data.totalSections as number,
        data.sectionName as string,
      );
      break;
    case 'keyframe':
      draft.setKeyframeProgress(
        data.keyframeIndex as number,
        data.totalKeyframes as number,
      );
      break;
    case 'smoothing':
      draft.setSmoothingResult(
        (data.adjustments as number) || 0,
        (data.summary as string) || '',
      );
      break;
    case 'done':
      draft.setDraftDone(
        data.tokensUsed as number,
        data.keyframesGenerated as number,
      );
      break;
    case 'paused':
      draft.setDraftStatus('paused');
      break;
    case 'cancelled':
      draft.setDraftStatus('idle');
      break;
    case 'error':
      draft.setDraftError(data.message as string);
      break;
  }
}
