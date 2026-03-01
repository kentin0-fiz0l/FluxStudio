/**
 * PageErrorFallback - Reusable page-level error fallback with centered card layout.
 */

import { ReactNode } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';

export interface PageErrorFallbackProps {
  icon?: ReactNode;
  iconBgColor?: string;
  title: string;
  message: string;
  primaryAction?: { label: string; onClick: () => void; icon?: ReactNode };
  secondaryAction?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Optional className overrides for the outer wrapper */
  wrapperClassName?: string;
}

export function PageErrorFallback({
  icon,
  iconBgColor = 'bg-orange-100',
  title,
  message,
  primaryAction,
  secondaryAction,
  wrapperClassName = 'min-h-screen bg-gray-50 flex items-center justify-center p-4',
}: PageErrorFallbackProps) {
  return (
    <div className={wrapperClassName}>
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          {icon && (
            <div className={`w-12 h-12 rounded-full ${iconBgColor} mx-auto mb-4 flex items-center justify-center`}>
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          {(primaryAction || secondaryAction) && (
            <div className="flex gap-3 justify-center">
              {primaryAction && (
                <Button onClick={primaryAction.onClick}>
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button variant="outline" onClick={secondaryAction.onClick}>
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
