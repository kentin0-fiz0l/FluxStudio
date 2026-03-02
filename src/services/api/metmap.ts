/**
 * MetMap API endpoints - Musical Timeline Tool
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function metmapApi(service: ApiService) {
  return {
    // ========================================
    // SONGS
    // ========================================

    getSongs(params?: { projectId?: string; search?: string; limit?: number; offset?: number; orderBy?: string; orderDir?: string }) {
      const query = new URLSearchParams();
      if (params?.projectId) query.set('projectId', params.projectId);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      if (params?.orderBy) query.set('orderBy', params.orderBy);
      if (params?.orderDir) query.set('orderDir', params.orderDir);
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/metmap/songs${qs ? `?${qs}` : ''}`));
    },

    getStats() {
      return service.makeRequest(buildApiUrl('/metmap/stats'));
    },

    createSong(data: { title: string; description?: string; projectId?: string; bpmDefault?: number; timeSignatureDefault?: string }) {
      return service.makeRequest(buildApiUrl('/metmap/songs'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getSong(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}`));
    },

    updateSong(songId: string, data: { title?: string; description?: string; projectId?: string; bpmDefault?: number; timeSignatureDefault?: string }) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteSong(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}`), {
        method: 'DELETE',
      });
    },

    // ========================================
    // AUDIO
    // ========================================

    uploadSongAudio(songId: string, formData: FormData) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/audio`), {
        method: 'POST',
        body: formData,
      });
    },

    deleteSongAudio(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/audio`), {
        method: 'DELETE',
      });
    },

    updateSongBeatMap(songId: string, data: { beatMap: unknown; detectedBpm?: number; audioDurationSeconds?: number }) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/beat-map`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // ========================================
    // SECTIONS
    // ========================================

    getSections(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/sections`));
    },

    upsertSections(songId: string, sections: unknown[]) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/sections`), {
        method: 'PUT',
        body: JSON.stringify({ sections }),
      });
    },

    deleteSection(sectionId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/sections/${sectionId}`), {
        method: 'DELETE',
      });
    },

    // ========================================
    // CHORDS
    // ========================================

    getChords(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/chords`));
    },

    upsertChords(sectionId: string, chords: unknown[]) {
      return service.makeRequest(buildApiUrl(`/metmap/sections/${sectionId}/chords`), {
        method: 'PUT',
        body: JSON.stringify({ chords }),
      });
    },

    deleteChord(chordId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/chords/${chordId}`), {
        method: 'DELETE',
      });
    },

    // ========================================
    // PRACTICE SESSIONS
    // ========================================

    startPractice(songId: string, settings?: Record<string, unknown>) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/practice`), {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });
    },

    endPractice(sessionId: string, notes?: string) {
      return service.makeRequest(buildApiUrl(`/metmap/practice/${sessionId}/end`), {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
    },

    getPracticeHistory(songId: string, params?: { limit?: number; offset?: number }) {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/practice-history${qs ? `?${qs}` : ''}`));
    },

    // ========================================
    // AUDIO TRACKS
    // ========================================

    getTracks(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/tracks`));
    },

    createTrack(songId: string, formData: FormData) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/tracks`), {
        method: 'POST',
        body: formData,
      });
    },

    updateTrack(trackId: string, data: { name?: string; volume?: number; pan?: number; muted?: boolean; solo?: boolean }) {
      return service.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteTrack(trackId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}`), {
        method: 'DELETE',
      });
    },

    reorderTrack(trackId: string, sortOrder: number) {
      return service.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}/reorder`), {
        method: 'PUT',
        body: JSON.stringify({ sortOrder }),
      });
    },

    updateTrackBeatMap(trackId: string, beatMap: unknown) {
      return service.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}/beat-map`), {
        method: 'PUT',
        body: JSON.stringify({ beatMap }),
      });
    },

    // ========================================
    // SNAPSHOTS
    // ========================================

    getSnapshots(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/snapshots`));
    },

    createSnapshot(songId: string, data: { name: string; description?: string; sectionCount?: number; totalBars?: number }) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/snapshots`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteSnapshot(songId: string, snapshotId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/snapshots/${snapshotId}`), {
        method: 'DELETE',
      });
    },

    restoreSnapshot(songId: string, snapshotId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/snapshots/${snapshotId}/restore`), {
        method: 'POST',
      });
    },

    // ========================================
    // BRANCHES
    // ========================================

    getBranches(songId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/branches`));
    },

    createBranch(songId: string, data: { name: string; description?: string; sourceSnapshotId?: string }) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/branches`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteBranch(songId: string, branchId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/branches/${branchId}`), {
        method: 'DELETE',
      });
    },

    mergeBranch(songId: string, branchId: string) {
      return service.makeRequest(buildApiUrl(`/metmap/songs/${songId}/branches/${branchId}/merge`), {
        method: 'POST',
      });
    },
  };
}
