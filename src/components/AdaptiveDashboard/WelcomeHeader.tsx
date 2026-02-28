import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sparkles, Plus } from 'lucide-react';

interface WelcomeHeaderProps {
  welcomeMessage: string;
  currentContext: string;
  currentMode: string;
  organizationName?: string;
  onOpenCommandPalette: () => void;
}

export function WelcomeHeader({
  welcomeMessage,
  currentContext,
  currentMode,
  organizationName,
  onOpenCommandPalette,
}: WelcomeHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {welcomeMessage}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">
            {currentContext}
          </Badge>
          <Badge variant="outline">
            {currentMode}
          </Badge>
          {organizationName && (
            <Badge variant="secondary">
              {organizationName}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex"
          aria-label="Open quick actions menu"
        >
          <Sparkles size={16} className="mr-2" aria-hidden="true" />
          Quick Actions
        </Button>
        <Button aria-label="Create new project">
          <Plus size={16} className="mr-2" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </header>
  );
}
