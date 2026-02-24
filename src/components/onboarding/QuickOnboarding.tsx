/**
 * QuickOnboarding - 60-second onboarding flow
 *
 * Replaces the complex 65-field wizard with a single-field project creation.
 * Users create their first project in under 60 seconds.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  Lightbulb,
  Folder,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/slices/authSlice';

interface QuickOnboardingProps {
  onComplete?: (projectId: string) => void;
  onSkip?: () => void;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  folders: string[];
  color: string;
}

const templates: ProjectTemplate[] = [
  {
    id: 'marching-band',
    name: 'Marching Band Show',
    description: 'Complete show production with formations, music, and props',
    icon: <Sparkles className="w-5 h-5" aria-hidden="true" />,
    folders: ['Music & Audio', 'Formations', 'Costumes', 'Props & Equipment'],
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'indoor-winds',
    name: 'Indoor Winds',
    description: 'Indoor percussion and winds ensemble production',
    icon: <Lightbulb className="w-5 h-5" aria-hidden="true" />,
    folders: ['Music', 'Choreography', 'Floor Design', 'Equipment'],
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'design-project',
    name: 'Design Project',
    description: 'General creative design and collaboration',
    icon: <Folder className="w-5 h-5" aria-hidden="true" />,
    folders: ['Designs', 'Assets', 'References', 'Deliverables'],
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with an empty project',
    icon: <Briefcase className="w-5 h-5" aria-hidden="true" />,
    folders: [],
    color: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
  },
];

export function QuickOnboarding({ onComplete, onSkip }: QuickOnboardingProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'name' | 'template' | 'creating' | 'done'>('name');

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    setStep('creating');
    setIsCreating(true);

    try {
      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          template: selectedTemplate,
          status: 'planning',
          priority: 'medium',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { data: project } = await response.json();

      setStep('done');

      // Wait briefly to show success state
      setTimeout(() => {
        if (onComplete) {
          onComplete(project.id);
        } else {
          navigate(`/projects/${project.id}`);
        }
      }, 1500);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsCreating(false);
      setStep('name');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && projectName.trim()) {
      if (step === 'name') {
        setStep('template');
      } else if (step === 'template') {
        handleCreateProject();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <AnimatePresence mode="wait">
          {/* Step 1: Project Name */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-2xl">
                    Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                  </CardTitle>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    Let's create your first project in under 60 seconds.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label
                      htmlFor="project-name"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                    >
                      What are you working on?
                    </label>
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g., Summer Show 2025"
                      className="text-lg h-12"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      onClick={onSkip}
                      className="text-neutral-500"
                    >
                      Skip for now
                    </Button>
                    <Button
                      onClick={() => setStep('template')}
                      disabled={!projectName.trim()}
                      className="gap-2"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Template Selection */}
          {step === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">
                    Choose a starting point
                  </CardTitle>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    Pick a template or start blank. You can always customize later.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        aria-label={`Select ${template.name} template`}
                        aria-pressed={selectedTemplate === template.id}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all',
                          selectedTemplate === template.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                            template.color
                          )}
                        >
                          {template.icon}
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setStep('name')}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={isCreating}
                      className="gap-2"
                    >
                      Create "{projectName}"
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Creating */}
          {step === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="shadow-2xl border-0">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700 animate-pulse mx-auto mb-4" />
                  <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded mx-auto mb-3" />
                  <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded mx-auto" />
                  <p className="sr-only" role="status">Creating your project, please wait...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="shadow-2xl border-0">
                <CardContent className="py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-success-500 mx-auto mb-4" aria-hidden="true" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Project created!
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                    Taking you to "{projectName}"...
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default QuickOnboarding;
