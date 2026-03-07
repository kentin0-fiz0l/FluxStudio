/**
 * LMSShareSection - Share to Google Classroom / Canvas LMS
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Share2, ExternalLink } from 'lucide-react';
import {
  getLMSProviders,
  getLMSCourses,
  shareToLMS,
  getFormationEmbedUrl,
} from '../../../services/lmsIntegration';
import type { LMSProvider, ClassroomCourse } from '../../../services/lmsIntegration';

// ============================================================================
// Types
// ============================================================================

export interface LMSShareSectionProps {
  formationId: string;
  formationName: string;
  isOpen: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LMSShareSection({
  formationId,
  formationName,
  isOpen,
}: LMSShareSectionProps) {
  const { t } = useTranslation('common');
  const [lmsProviders, setLmsProviders] = useState<LMSProvider[]>([]);
  const [lmsCourses, setLmsCourses] = useState<ClassroomCourse[]>([]);
  const [lmsSelectedProvider, setLmsSelectedProvider] = useState<LMSProvider['id'] | null>(null);
  const [lmsSelectedCourse, setLmsSelectedCourse] = useState('');
  const [lmsShareTitle, setLmsShareTitle] = useState('');
  const [lmsSharing, setLmsSharing] = useState(false);
  const [lmsShareResult, setLmsShareResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  // Fetch LMS providers on mount
  useEffect(() => {
    if (!isOpen || !formationId) return;
    getLMSProviders('').then(setLmsProviders).catch(() => {
      // Silently fail — providers section just won't show connected status
    });
  }, [isOpen, formationId]);

  // Fetch courses when a provider is selected
  useEffect(() => {
    if (!lmsSelectedProvider) {
      setLmsCourses([]);
      return;
    }
    getLMSCourses(lmsSelectedProvider, '').then(setLmsCourses).catch(() => {
      setLmsCourses([]);
    });
  }, [lmsSelectedProvider]);

  // Reset share title to formation name when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLmsShareTitle(formationName);
      setLmsShareResult(null);
      setLmsSelectedProvider(null);
      setLmsSelectedCourse('');
    }
  }, [isOpen, formationName]);

  const handleLmsShare = useCallback(async () => {
    if (!lmsSelectedProvider || !lmsSelectedCourse || !formationId) return;
    setLmsSharing(true);
    setLmsShareResult(null);
    try {
      const result = await shareToLMS(
        {
          provider: lmsSelectedProvider,
          courseId: lmsSelectedCourse,
          title: lmsShareTitle || formationName,
          formationId,
          embedUrl: getFormationEmbedUrl(formationId),
        },
        '',
      );
      setLmsShareResult(result);
    } catch {
      setLmsShareResult({ success: false, error: t('formation.lmsShare.shareFailed', 'Failed to share to LMS') });
    } finally {
      setLmsSharing(false);
    }
  }, [lmsSelectedProvider, lmsSelectedCourse, lmsShareTitle, formationId, formationName]);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Share2 className="w-4 h-4" aria-hidden="true" />
        {t('formation.lmsShare.shareToClassroom', 'Share to Classroom')}
      </h3>
      <div className="flex gap-2 mb-3">
        {(['google_classroom', 'canvas_lms'] as const).map((providerId) => {
          const providerInfo = lmsProviders.find((p) => p.id === providerId);
          const label = providerId === 'google_classroom' ? 'Google Classroom' : 'Canvas LMS';
          return (
            <button
              key={providerId}
              onClick={() => setLmsSelectedProvider(lmsSelectedProvider === providerId ? null : providerId)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                lmsSelectedProvider === providerId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {label}
              {providerInfo?.connected && (
                <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {lmsSelectedProvider && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('formation.lmsShare.course', 'Course')}
            </label>
            <select
              value={lmsSelectedCourse}
              onChange={(e) => setLmsSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-sm"
            >
              <option value="">{t('formation.lmsShare.selectCourse', 'Select a course...')}</option>
              {lmsCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}{course.section ? ` - ${course.section}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('formation.lmsShare.assignmentTitle', 'Assignment Title')}
            </label>
            <input
              type="text"
              value={lmsShareTitle}
              onChange={(e) => setLmsShareTitle(e.target.value)}
              placeholder={t('formation.lmsShare.enterAssignmentTitle', 'Enter assignment title')}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-sm"
            />
          </div>

          <button
            onClick={handleLmsShare}
            disabled={lmsSharing || !lmsSelectedCourse || !lmsShareTitle}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lmsSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t('formation.lmsShare.sharing', 'Sharing...')}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" aria-hidden="true" />
                {t('formation.lmsShare.shareTo', 'Share to {{provider}}', { provider: lmsSelectedProvider === 'google_classroom' ? 'Google Classroom' : 'Canvas LMS' })}
              </>
            )}
          </button>

          {lmsShareResult && (
            <div
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                lmsShareResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {lmsShareResult.success ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {t('formation.lmsShare.sharedSuccessfully', 'Shared successfully!')}
                  {lmsShareResult.url && (
                    <a
                      href={lmsShareResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline ml-1"
                    >
                      {t('actions.view', 'View')} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </>
              ) : (
                <span>{lmsShareResult.error || t('formation.lmsShare.shareFailedGeneric', 'Share failed')}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
