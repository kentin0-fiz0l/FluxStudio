/**
 * Tab panel content components for ProjectDetail
 * Extracted from monolithic ProjectDetail.tsx
 */

import * as React from 'react';
import {
  CheckSquare,
  List,
  Columns,
  Layers,
  PenTool,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { TaskListView } from '@/components/tasks/TaskListView';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { ActivityFeed } from '@/components/tasks/ActivityFeed';
import type { Task } from '@/hooks/useTasks';
import type { AssetRecord } from '@/contexts/AssetsContext';
import { cn } from '@/lib/utils';
import { QuickStats } from './ProjectDetailHelpers';

// ============================================================================
// Tasks Tab
// ============================================================================

type ViewMode = 'list' | 'kanban';

export const TasksTabPanel: React.FC<{
  id: string;
  tasks: Task[];
  tasksLoading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onCreateTask: () => void;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
}> = ({ id, tasks, tasksLoading, viewMode, setViewMode, onCreateTask, onTaskClick, onTaskUpdate, onTaskDelete }) => (
  <div className="flex h-full">
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-neutral-900">Tasks</h2>
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-white shadow text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-all',
                viewMode === 'kanban'
                  ? 'bg-white shadow text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
              aria-label="Kanban view"
              aria-pressed={viewMode === 'kanban'}
            >
              <Columns className="h-4 w-4" />
              Kanban
            </button>
          </div>
        </div>
        <Button
          onClick={onCreateTask}
          variant="primary"
          icon={<CheckSquare className="h-4 w-4" />}
          aria-label="Create new task"
        >
          New Task
        </Button>
      </div>

      {viewMode === 'list' ? (
        <TaskListView
          projectId={id}
          tasks={tasks}
          onTaskUpdate={onTaskUpdate}
          onTaskDelete={onTaskDelete}
          onTaskCreate={onCreateTask}
          loading={tasksLoading}
        />
      ) : (
        <KanbanBoard
          projectId={id}
          tasks={tasks}
          onTaskUpdate={onTaskUpdate}
          onTaskClick={onTaskClick}
          onTaskCreate={onCreateTask}
          loading={tasksLoading}
        />
      )}
    </main>

    <aside className="w-80 border-l border-neutral-200 overflow-y-auto flex-shrink-0">
      <div className="p-6 space-y-6">
        <QuickStats tasks={tasks} />
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <ActivityFeed projectId={id} compact maxItems={10} />
        </div>
      </div>
    </aside>
  </div>
);

// ============================================================================
// Assets Tab
// ============================================================================

export const AssetsTabPanel: React.FC<{
  projectAssets: AssetRecord[];
  loading: boolean;
  onSelectAsset: (asset: AssetRecord) => void;
}> = ({ projectAssets, loading, onSelectAsset }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-neutral-900">Project Assets</h2>
      <Button
        variant="outline"
        onClick={() => window.location.href = '/assets'}
        aria-label="View all assets"
      >
        <Layers className="h-4 w-4 mr-2" />
        Manage All Assets
      </Button>
    </div>

    {loading ? (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ) : projectAssets.length === 0 ? (
      <Card className="p-8 text-center">
        <Layers className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No assets yet</h3>
        <p className="text-neutral-600 mb-4">
          Create assets from your uploaded files to track versions and metadata.
        </p>
        <Button variant="primary" onClick={() => window.location.href = '/assets'}>
          Go to Assets
        </Button>
      </Card>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {projectAssets.map((asset) => (
          <button
            type="button"
            key={asset.id}
            className="group bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer text-left w-full"
            onClick={() => onSelectAsset(asset)}
            aria-label={`View asset: ${asset.name}`}
          >
            <div className="aspect-square bg-neutral-100 relative overflow-hidden">
              {asset.thumbnailUrl ? (
                <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="w-12 h-12 text-neutral-300" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                v{asset.currentVersion}
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-neutral-900 truncate">{asset.name}</h4>
              <p className="text-xs text-neutral-500 mt-1">
                {new Date(asset.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

// ============================================================================
// Boards Tab
// ============================================================================

interface DesignBoard {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const BoardsTabPanel: React.FC<{
  boards: DesignBoard[];
  boardsLoading: boolean;
  newBoardName: string;
  setNewBoardName: (name: string) => void;
  showNewBoardInput: boolean;
  setShowNewBoardInput: (show: boolean) => void;
  onCreateBoard: () => void;
}> = ({ boards, boardsLoading, newBoardName, setNewBoardName, showNewBoardInput, setShowNewBoardInput, onCreateBoard }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Design Boards</h2>
        {!showNewBoardInput ? (
          <Button variant="primary" onClick={() => setShowNewBoardInput(true)} aria-label="Create new board">
            <Plus className="h-4 w-4 mr-2" />
            New Board
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name..."
              className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && onCreateBoard()}
              autoFocus
            />
            <Button variant="primary" onClick={onCreateBoard}>Create</Button>
            <Button variant="ghost" onClick={() => { setShowNewBoardInput(false); setNewBoardName(''); }}>Cancel</Button>
          </div>
        )}
      </div>

      {boardsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : boards.length === 0 ? (
        <Card className="p-8 text-center">
          <PenTool className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No design boards yet</h3>
          <p className="text-neutral-600 mb-4">
            Create a board to start collaborating on 2D designs with your team.
          </p>
          <Button variant="primary" onClick={() => setShowNewBoardInput(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Board
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="group overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer"
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              <div className="aspect-video bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center">
                <PenTool className="w-12 h-12 text-primary-400" />
              </div>
              <div className="p-4">
                <h4 className="font-medium text-neutral-900 truncate">{board.name}</h4>
                {board.description && (
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{board.description}</p>
                )}
                <p className="text-xs text-neutral-400 mt-2">
                  Updated {new Date(board.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export type { DesignBoard, ViewMode };
