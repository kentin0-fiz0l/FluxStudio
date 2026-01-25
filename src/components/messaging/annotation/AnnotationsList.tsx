/**
 * AnnotationsList Component
 * Sidebar displaying list of annotations with selection and deletion
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Clock, Wifi } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ImageAnnotation } from '../../../types/messaging';
import { cn } from '../../../lib/utils';

interface AnnotationsListProps {
  annotations: ImageAnnotation[];
  selectedAnnotation: string | null;
  onAnnotationSelect: (annotation: ImageAnnotation) => void;
  onAnnotationDelete: (annotationId: string) => void;
  isConnected: boolean;
  readOnly?: boolean;
}

export function AnnotationsList({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  isConnected,
  readOnly = false
}: AnnotationsListProps) {
  return (
    <div className="w-80 border-l bg-background">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              Annotations
              <Badge variant="secondary">{annotations.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Real-time</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {annotations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Pencil className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No annotations yet</p>
              <p className="text-sm">Click on the image to add feedback</p>
            </div>
          ) : (
            annotations.map((annotation, index) => (
              <motion.div
                key={annotation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-all",
                  selectedAnnotation === annotation.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                onClick={() => onAnnotationSelect(annotation)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                      style={{ backgroundColor: annotation.color }}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium capitalize">
                      {annotation.type}
                    </span>
                    {annotation.type === 'freehand' && (
                      <Badge variant="outline" className="text-xs">
                        Drawing
                      </Badge>
                    )}
                  </div>

                  {!readOnly && selectedAnnotation === annotation.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotationDelete(annotation.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {annotation.content && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {annotation.content}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={annotation.createdBy.avatar} />
                    <AvatarFallback className="text-xs">
                      {annotation.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{annotation.createdBy.name}</span>
                  <span>•</span>
                  <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Real-time indicators */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {isConnected && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                        <Wifi className="w-2 h-2 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>

                  {annotation.id.startsWith('temp-') && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                      Saving...
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
