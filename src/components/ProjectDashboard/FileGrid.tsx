import React from 'react';
import { Upload, Eye, Download, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getFileIcon, formatFileSize } from './project-dashboard-utils';
import { CATEGORY_BADGE_COLORS, FILE_STATUS_BADGE_COLORS } from './project-dashboard-constants';

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string;
}

interface FileGridProps {
  isLoadingFiles: boolean;
  filteredFiles: FileItem[];
  viewMode: 'grid' | 'list';
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileGrid({ isLoadingFiles, filteredFiles, viewMode, handleFileUpload }: FileGridProps) {
  if (isLoadingFiles) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-white/10 border border-white/10 animate-pulse">
            <CardContent className="p-4">
              <div className="h-32 bg-white/10 rounded mb-4"></div>
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/5 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredFiles.length > 0) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredFiles.map((file) => (
          <Card
            key={file.id}
            className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
          >
            <CardContent className="p-4">
              {viewMode === 'grid' && (
                <div className="aspect-video bg-white/5 rounded-lg mb-4 flex items-center justify-center">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-white/40">
                      {getFileIcon(file.mimeType)}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex ${viewMode === 'list' ? 'items-center gap-4' : 'flex-col'}`}>
                {viewMode === 'list' && (
                  <div className="text-white/40">
                    {getFileIcon(file.mimeType)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{file.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={`text-xs ${CATEGORY_BADGE_COLORS[file.category] || CATEGORY_BADGE_COLORS.default}`}
                    >
                      {file.category}
                    </Badge>
                    <Badge
                      className={`text-xs ${FILE_STATUS_BADGE_COLORS[file.status] || FILE_STATUS_BADGE_COLORS.default}`}
                    >
                      {file.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-white/10 border border-white/10 border-dashed">
      <CardContent className="py-12 text-center">
        <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-xl font-semibold text-white mb-2">No Files Yet</h3>
        <p className="text-gray-400 mb-4">Upload your first file to get started</p>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            multiple
          />
          <Button className="bg-purple-500 hover:bg-purple-600 text-white">
            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
            Upload Files
          </Button>
        </label>
      </CardContent>
    </Card>
  );
}
