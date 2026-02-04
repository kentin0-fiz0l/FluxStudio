import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { WidgetLayout, WIDGET_DIMENSIONS } from './types';
import { getWidgetById, getDefaultWidgets } from './registry';
import { cn } from '../ui/utils';

interface WidgetGridProps {
  className?: string;
  maxColumns?: number;
}

export function WidgetGrid({ className, maxColumns = 3 }: WidgetGridProps) {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<WidgetLayout[]>([]);

  // Define generateGridLayout before useEffect to fix "Cannot access variable before declared"
  const generateGridLayout = (widgetIds: string[], cols: number): WidgetLayout[] => {
    let currentX = 0;
    let currentY = 0;
    const rowHeights: number[] = [];

    return widgetIds.map(widgetId => {
      const widget = getWidgetById(widgetId);
      if (!widget) return { id: widgetId, x: 0, y: 0, w: 1, h: 1 };

      const dimensions = WIDGET_DIMENSIONS[widget.size];

      // Check if widget fits in current row
      if (currentX + dimensions.w > cols) {
        // Move to next row
        currentX = 0;
        currentY = Math.max(...rowHeights, currentY);
      }

      const layout: WidgetLayout = {
        id: widgetId,
        x: currentX,
        y: currentY,
        w: dimensions.w,
        h: dimensions.h,
        isDraggable: widget.isDraggable,
        isResizable: widget.isResizable,
      };

      // Update row height tracking
      for (let i = currentX; i < currentX + dimensions.w; i++) {
        rowHeights[i] = Math.max(rowHeights[i] || 0, currentY + dimensions.h);
      }

      currentX += dimensions.w;

      return layout;
    });
  };

  useEffect(() => {
    if (user) {
      // Load user's widget configuration or use defaults
      const defaultWidgets = getDefaultWidgets(user.userType);

      // Generate basic grid layout
      const gridLayout = generateGridLayout(defaultWidgets, maxColumns);

      // Use queueMicrotask to avoid setState synchronously in effect
      queueMicrotask(() => {
        setWidgets(defaultWidgets);
        setLayouts(gridLayout);
      });
    }
  }, [user, maxColumns]);

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(id => id !== widgetId));
    setLayouts(prev => prev.filter(layout => layout.id !== widgetId));
  };

  if (!user) return null;

  return (
    <div
      className={cn(
        'grid gap-6 w-full',
        maxColumns === 1 && 'grid-cols-1',
        maxColumns === 2 && 'grid-cols-1 md:grid-cols-2',
        maxColumns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        maxColumns >= 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {widgets.map(widgetId => {
        const widgetConfig = getWidgetById(widgetId);
        const layout = layouts.find(l => l.id === widgetId);

        if (!widgetConfig || !layout) return null;

        const WidgetComponent = widgetConfig.component;

        // Determine grid column span based on widget size
        const getGridSpan = (size: string) => {
          switch (size) {
            case 'small':
              return 'col-span-1';
            case 'medium':
              return 'col-span-1 md:col-span-1';
            case 'large':
              return 'col-span-1 md:col-span-2';
            case 'wide':
              return 'col-span-1 md:col-span-2 lg:col-span-3';
            case 'tall':
              return 'col-span-1 row-span-2';
            case 'extra-large':
              return 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2';
            default:
              return 'col-span-1';
          }
        };

        return (
          <div
            key={widgetId}
            className={cn(
              'transition-all duration-200',
              getGridSpan(widgetConfig.size)
            )}
          >
            <WidgetComponent
              config={widgetConfig}
              onRefresh={() => {
                // Handle widget refresh
                console.log(`Refreshing widget: ${widgetId}`);
              }}
              onConfigChange={(config) => {
                // Handle widget configuration change
                console.log(`Updating widget config: ${widgetId}`, config);
              }}
              onRemove={() => removeWidget(widgetId)}
            />
          </div>
        );
      })}

      {/* Empty state or add widget placeholder */}
      {widgets.length === 0 && (
        <div className="col-span-full flex items-center justify-center p-12 border-2 border-dashed border-white/20 rounded-lg">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Widgets Added</h3>
            <p className="text-gray-400 mb-4">Customize your dashboard by adding widgets</p>
            <button
              onClick={() => {
                // Open widget picker
                const defaultWidgets = getDefaultWidgets(user.userType);
                setWidgets(defaultWidgets);
                const gridLayout = generateGridLayout(defaultWidgets, maxColumns);
                setLayouts(gridLayout);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Add Default Widgets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}