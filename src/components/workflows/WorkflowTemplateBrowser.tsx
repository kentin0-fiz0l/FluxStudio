import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { workflowEngine, type WorkflowTemplate } from '@/services/workflowEngine';
import { toast } from '@/lib/toast';

const categoryVariants: Record<WorkflowTemplate['category'], 'default' | 'secondary' | 'outline'> = {
  project: 'default',
  communication: 'secondary',
  review: 'outline',
  onboarding: 'secondary',
  custom: 'outline',
};

export function WorkflowTemplateBrowser() {
  const templates = workflowEngine.getTemplates();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleActivate = async (template: WorkflowTemplate) => {
    setActivatingId(template.id);
    try {
      // Placeholder: in production this would start the workflow with real context
      toast.success(`Workflow "${template.name}" activated`);
    } finally {
      setActivatingId(null);
    }
  };

  if (templates.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-8">
        No workflow templates available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="flex flex-col">
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                {template.name}
              </h4>
              <Badge variant={categoryVariants[template.category]} size="sm">
                {template.category}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 flex-1">
              {template.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                icon={<Play className="h-3 w-3" aria-hidden="true" />}
                onClick={() => handleActivate(template)}
                disabled={activatingId === template.id}
              >
                Activate
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default WorkflowTemplateBrowser;
