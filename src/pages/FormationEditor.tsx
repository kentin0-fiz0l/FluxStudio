/**
 * Formation Editor Page - FluxStudio
 *
 * Page wrapper for the FormationCanvas component.
 * Handles routing, project context, and layout.
 */

import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { FormationCanvas } from '@/components/formation';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Formation } from '../services/formationService';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export default function FormationEditor() {
  const { projectId, formationId: rawFormationId } = useParams<{
    projectId: string;
    formationId?: string;
  }>();
  // Treat "new" as undefined - it's a special route for creating new formations
  const formationId = rawFormationId === 'new' ? undefined : rawFormationId;
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const { addNotification } = useNotification();

  // Handle save
  const handleSave = React.useCallback(
    (formation: Formation) => {
      addNotification({
        type: 'success',
        title: 'Formation Saved',
        message: `"${formation.name}" has been saved successfully.`,
      });
    },
    [addNotification]
  );

  // Handle close/back navigation
  const handleClose = React.useCallback(() => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  }, [navigate, projectId]);

  // Validate project ID
  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select a project to create or edit formations.
          </p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header with back button */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formationId ? 'Edit Formation' : 'New Formation'}
            </h1>
          </div>
        </div>

        {/* Formation Canvas */}
        <div className="flex-1 overflow-hidden">
          <FormationCanvas
            projectId={projectId}
            formationId={formationId}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
