import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { SmartTagging } from '../SmartTagging';
import type { UploadedFile } from './types';

export interface FileAnalysisPanelProps {
  selectedFile: UploadedFile;
  onClose: () => void;
  onTagsChange: (fileId: string, tags: string[]) => void;
}

export const FileAnalysisPanel: React.FC<FileAnalysisPanelProps> = ({
  selectedFile,
  onClose,
  onTagsChange,
}) => {
  if (!selectedFile.analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white border border-gray-200 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">
            Analysis Details
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* File Metadata */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            File Information
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Category:</span>{' '}
              <span className="font-medium capitalize">
                {selectedFile.analysis.category}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Confidence:</span>{' '}
              <span className="font-medium">
                {Math.round(selectedFile.analysis.confidence * 100)}%
              </span>
            </div>
            {selectedFile.analysis.qualityScore && (
              <div>
                <span className="text-gray-600">Quality:</span>{' '}
                <span className="font-medium">
                  {selectedFile.analysis.qualityScore}/100
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Processing:</span>{' '}
              <span className="font-medium">
                {selectedFile.analysis.processingTime}ms
              </span>
            </div>
          </div>
        </div>

        {/* Image Analysis */}
        {selectedFile.analysis.imageAnalysis && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Image Analysis
            </h4>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">Dimensions:</span>{' '}
                <span className="font-medium">
                  {selectedFile.analysis.imageAnalysis.dimensions.width} ×{' '}
                  {selectedFile.analysis.imageAnalysis.dimensions.height}
                </span>
              </div>
              {selectedFile.analysis.imageAnalysis.dominantColors && (
                <div>
                  <span className="text-sm text-gray-600 mb-1 block">
                    Dominant Colors:
                  </span>
                  <div className="flex gap-2">
                    {selectedFile.analysis.imageAnalysis.dominantColors.map(
                      (color, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Analysis */}
        {selectedFile.analysis.textAnalysis && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Text Analysis
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Words:</span>{' '}
                <span className="font-medium">
                  {selectedFile.analysis.textAnalysis.wordCount}
                </span>
              </div>
              {selectedFile.analysis.textAnalysis.sentiment && (
                <div>
                  <span className="text-gray-600">Sentiment:</span>{' '}
                  <Badge
                    variant={
                      selectedFile.analysis.textAnalysis.sentiment === 'positive'
                        ? 'default'
                        : selectedFile.analysis.textAnalysis.sentiment ===
                          'negative'
                        ? 'error'
                        : 'secondary'
                    }
                    className="ml-2"
                  >
                    {selectedFile.analysis.textAnalysis.sentiment}
                  </Badge>
                </div>
              )}
              {selectedFile.analysis.textAnalysis.keywords &&
                selectedFile.analysis.textAnalysis.keywords.length > 0 && (
                  <div>
                    <span className="text-gray-600 block mb-1">Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedFile.analysis.textAnalysis.keywords.map(
                        (keyword, index) => (
                          <span
                            key={index}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Insights */}
        {selectedFile.analysis.insights &&
          selectedFile.analysis.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                AI Insights
              </h4>
              <ul className="space-y-1">
                {selectedFile.analysis.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-gray-600 flex gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Tag Management */}
        <div>
          <SmartTagging
            fileId={selectedFile.id}
            tags={selectedFile.selectedTags || []}
            onTagsChange={(tags) => onTagsChange(selectedFile.id, tags)}
            showAnalytics={false}
            showHierarchy={false}
          />
        </div>
      </div>
    </motion.div>
  );
};
