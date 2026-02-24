/**
 * FormationsTab Component - FluxStudio Drill Writer
 *
 * Displays a grid of formations for a project with create/delete functionality.
 * Used as a tab within ProjectDetail page.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Clock, Trash2, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useFormations } from '../../hooks/useFormations';

interface FormationsTabProps {
  projectId: string;
}

export function FormationsTab({ projectId }: FormationsTabProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  // Formations data from API
  const { formations, loading, error, create, remove } = useFormations({
    projectId,
    enabled: true
  });

  // UI state
  const [showNewFormationInput, setShowNewFormationInput] = useState(false);
  const [newFormationName, setNewFormationName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create new formation
  const handleCreateFormation = async () => {
    if (!newFormationName.trim()) return;

    setCreating(true);
    try {
      const formation = await create({ name: newFormationName.trim() });
      setNewFormationName('');
      setShowNewFormationInput(false);
      // Navigate to the new formation
      navigate(`/projects/${projectId}/formations/${formation.id}`);
    } catch (err) {
      console.error('Error creating formation:', err);
    } finally {
      setCreating(false);
    }
  };

  // Delete formation
  const handleDeleteFormation = async (e: React.MouseEvent, formationId: string) => {
    e.stopPropagation();

    if (!confirm(t('formation.confirmDelete', 'Are you sure you want to delete this formation?'))) {
      return;
    }

    setDeletingId(formationId);
    try {
      await remove(formationId);
    } catch (err) {
      console.error('Error deleting formation:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('actions.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {t('formation.drillFormations', 'Drill Formations')}
        </h2>
        {!showNewFormationInput ? (
          <Button
            variant="primary"
            onClick={() => setShowNewFormationInput(true)}
            aria-label={t('formation.createNew', 'Create new formation')}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('formation.newFormation', 'New Formation')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFormationName}
              onChange={(e) => setNewFormationName(e.target.value)}
              placeholder={t('formation.namePlaceholder', 'Formation name...')}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFormation()}
              autoFocus
              disabled={creating}
            />
            <Button
              variant="primary"
              onClick={handleCreateFormation}
              disabled={creating || !newFormationName.trim()}
            >
              {creating ? t('actions.creating', 'Creating...') : t('actions.create', 'Create')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewFormationInput(false);
                setNewFormationName('');
              }}
              disabled={creating}
            >
              {t('actions.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {formations.length === 0 ? (
        <Card className="p-8 text-center">
          <Play className="h-12 w-12 mx-auto text-neutral-400 mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            {t('formation.noFormationsYet', 'No formations yet')}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {t('formation.emptyStateDesc', 'Create a formation to start designing drill sequences for your show.')}
          </p>
          <Button
            variant="primary"
            onClick={() => setShowNewFormationInput(true)}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('formation.createFirst', 'Create First Formation')}
          </Button>
        </Card>
      ) : (
        /* Formations grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {formations.map((formation) => (
            <Card
              key={formation.id}
              interactive
              className="group overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer relative"
              onClick={() => navigate(`/projects/${projectId}/formations/${formation.id}`)}
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteFormation(e, formation.id)}
                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-neutral-800/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900 z-10"
                disabled={deletingId === formation.id}
                aria-label={t('formation.delete', 'Delete formation')}
              >
                {deletingId === formation.id ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
                )}
              </button>

              {/* Preview area */}
              <div className="aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center relative">
                <Play className="w-12 h-12 text-indigo-400 dark:text-indigo-300" aria-hidden="true" />

                {/* Stats overlay */}
                <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 bg-white/80 dark:bg-neutral-800/80 px-2 py-1 rounded-full">
                    <Users className="w-3 h-3" aria-hidden="true" />
                    {formation.performerCount}
                  </span>
                  <span className="flex items-center gap-1 bg-white/80 dark:bg-neutral-800/80 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formation.keyframeCount}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {formation.name}
                </h4>
                {formation.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {formation.description}
                  </p>
                )}
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                  {t('common.updated', 'Updated')} {new Date(formation.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default FormationsTab;
