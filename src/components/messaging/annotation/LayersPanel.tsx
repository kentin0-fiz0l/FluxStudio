/**
 * LayersPanel Component
 * Layer management for organizing annotations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../../lib/utils';

interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  annotations: string[];
  color: string;
}

interface LayersPanelProps {
  isOpen: boolean;
  layers: AnnotationLayer[];
  activeLayer: string;
  onLayerSelect: (layerId: string) => void;
  onCreateLayer: () => void;
  onToggleVisibility: (layerId: string) => void;
}

export function LayersPanel({
  isOpen,
  layers,
  activeLayer,
  onLayerSelect,
  onCreateLayer,
  onToggleVisibility
}: LayersPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l bg-background overflow-hidden"
        >
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Layers</CardTitle>
                <Button
                  size="sm"
                  onClick={onCreateLayer}
                  className="h-7"
                >
                  <Layers className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={cn(
                    "p-2 border rounded cursor-pointer transition-colors",
                    activeLayer === layer.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  )}
                  onClick={() => onLayerSelect(layer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm font-medium">{layer.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {layer.annotations.length} annotations
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type { AnnotationLayer };
