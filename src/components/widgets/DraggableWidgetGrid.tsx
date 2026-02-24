import React, { Suspense, useCallback, useMemo } from 'react';
// @ts-expect-error - react-grid-layout types are provided by the package
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/store/slices/authSlice';
import { useWidgetLayout } from '../../hooks/useWidgetLayout';
import { getWidgetById } from './registry';
import { cn } from '../ui/utils';
import { WidgetProps } from './types';

// CSS imports for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableWidgetGridProps {
  className?: string;
  isDraggable?: boolean;
  isResizable?: boolean;
  margin?: [number, number];
  containerPadding?: [number, number];
  rowHeight?: number;
}

interface AnimatedWidgetWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  index: number;
}

function AnimatedWidgetWrapper({ children, widgetId, index }: AnimatedWidgetWrapperProps) {
  return (
    <motion.div
      key={widgetId}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className="h-full w-full"
      layout
    >
      {children}
    </motion.div>
  );
}

export function DraggableWidgetGrid({
  className,
  isDraggable = true,
  isResizable = true,
  margin = [16, 16],
  containerPadding = [0, 0],
  rowHeight = 120,
}: DraggableWidgetGridProps) {
  const { user } = useAuth();
  const {
    layouts,
    widgets,
    saveLayout,
    removeWidget,
    isLoading
  } = useWidgetLayout();

  // Breakpoint configuration
  const breakpoints = useMemo(() => ({
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
  }), []);

  const cols = useMemo(() => ({
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
  }), []);

  // Handle layout changes
  const handleLayoutChange = useCallback((_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
    // Guard against undefined allLayouts from react-grid-layout
    if (!allLayouts || typeof allLayouts !== 'object') {
      return;
    }
    // Save the layout for the current breakpoint
    Object.entries(allLayouts).forEach(([breakpoint, breakpointLayout]) => {
      saveLayout(breakpoint, breakpointLayout);
    });
  }, [saveLayout]);

  // Handle widget removal
  const handleWidgetRemove = useCallback((widgetId: string) => {
    removeWidget(widgetId);
  }, [removeWidget]);

  // Handle widget refresh
  const handleWidgetRefresh = useCallback((_widgetId: string) => {
    // Implement widget-specific refresh logic
  }, []);

  // Handle widget configuration change
  const handleWidgetConfigChange = useCallback((_widgetId: string, _config: unknown) => {
    // Implement widget configuration change logic
  }, []);

  // Render individual widget with error boundary
  const renderWidget = useCallback((widgetId: string, index: number) => {
    const widgetConfig = getWidgetById(widgetId);

    if (!widgetConfig) {
      return (
        <AnimatedWidgetWrapper widgetId={widgetId} index={index}>
          <div className="h-full w-full flex items-center justify-center bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="text-center">
              <p className="text-red-400 font-medium">Widget not found</p>
              <p className="text-red-300 text-sm mt-1">{widgetId}</p>
            </div>
          </div>
        </AnimatedWidgetWrapper>
      );
    }

    const WidgetComponent = widgetConfig.component;

    const widgetProps: WidgetProps = {
      config: widgetConfig,
      onRefresh: () => handleWidgetRefresh(widgetId),
      onConfigChange: (config) => handleWidgetConfigChange(widgetId, config),
      onRemove: () => handleWidgetRemove(widgetId),
    };

    return (
      <AnimatedWidgetWrapper widgetId={widgetId} index={index}>
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center bg-white/5 border border-white/10 rounded-lg animate-pulse" />
        }>
          <div className="h-full w-full">
            <WidgetComponent {...widgetProps} />
          </div>
        </Suspense>
      </AnimatedWidgetWrapper>
    );
  }, [handleWidgetRefresh, handleWidgetConfigChange, handleWidgetRemove]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="h-48 bg-white/5 border border-white/10 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  // No user state
  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  // Empty widgets state
  if (widgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center p-12 border-2 border-dashed border-white/20 rounded-lg"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Widgets</h3>
          <p className="text-gray-400 mb-4">Your dashboard is empty. Add widgets to get started.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            onClick={() => {
              // This would typically open a widget palette
            }}
          >
            Add Widgets
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={rowHeight}
        margin={margin}
        containerPadding={containerPadding}
        isDraggable={isDraggable}
        isResizable={isResizable}
        preventCollision={false}
        autoSize={true}
        useCSSTransforms={true}
        transformScale={1}
        // Custom drag handle selector
        draggableHandle=".widget-drag-handle"
        // Animation during drag
        compactType="vertical"
        // Responsive behavior
        measureBeforeMount={false}
      >
        <AnimatePresence mode="popLayout">
          {widgets.map((widgetId, index) => (
            <div key={widgetId} className="widget-container">
              {renderWidget(widgetId, index)}
            </div>
          ))}
        </AnimatePresence>
      </ResponsiveGridLayout>

      {/* Add custom styles for grid layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        .react-grid-layout {
          position: relative;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }

        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9IiM0QzFFRkYiIGZpbGwtb3BhY2l0eT0iMC4zIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Im01IDVoMXYxaC0xeiIvPjxwYXRoIGQ9Im0zIDVoMXYxaC0xeiIvPjxwYXRoIGQ9Im01IDNoMXYxaC0xeiIvPjwvZz48L3N2Zz4=') no-repeat;
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }

        .react-grid-item:hover > .react-resizable-handle {
          opacity: 1;
        }

        .react-grid-item.react-grid-placeholder {
          background: rgba(59, 130, 246, 0.2);
          border: 2px dashed rgba(59, 130, 246, 0.6);
          opacity: 0.8;
          transition-duration: 100ms;
          z-index: 2;
          user-select: none;
          border-radius: 8px;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          transform: rotate(2deg);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        }

        .widget-container {
          height: 100%;
          width: 100%;
        }
      ` }} />
    </div>
  );
}