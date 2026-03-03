import { FileAnalysisResult } from '../../../services/aiAnalysis/fileAnalyzer';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'success' | 'error';
  error?: string;
  analysis?: FileAnalysisResult;
  selectedTags?: string[];
}

export interface EnhancedFileUploadProps {
  onUpload: (files: File[], analyses?: FileAnalysisResult[]) => Promise<void>;
  maxSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  enableAIAnalysis?: boolean;
  showInsights?: boolean;
  onAnalysisComplete?: (analysis: FileAnalysisResult) => void;
}
