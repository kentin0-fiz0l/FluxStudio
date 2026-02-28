import * as React from 'react';
import { List, RowComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { type Comment } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';
import { COMMENT_ROW_HEIGHT } from './comment-utils';

interface CommentRowProps {
  comments: Comment[];
  currentUserId: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

function CommentRowComponent({
  index,
  style,
  comments,
  currentUserId,
  onEdit,
  onDelete,
}: RowComponentProps<CommentRowProps>): React.ReactElement | null {
  const comment = comments[index];
  if (!comment) return null;

  return (
    <div style={style}>
      <div className="pb-4">
        <CommentItem
          comment={comment}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

interface VirtualizedCommentListProps {
  comments: Comment[];
  currentUserId: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

export const VirtualizedCommentList: React.FC<VirtualizedCommentListProps> = ({
  comments,
  currentUserId,
  onEdit,
  onDelete,
}) => {
  const rowProps = React.useMemo(() => ({
    comments,
    currentUserId,
    onEdit,
    onDelete,
  }), [comments, currentUserId, onEdit, onDelete]);

  const totalEstimatedHeight = Math.min(
    comments.length * COMMENT_ROW_HEIGHT,
    500
  );

  return (
    <div style={{ height: totalEstimatedHeight }}>
      <AutoSizer
        renderProp={({ height, width }) => (
          <List
            style={{ height: height ?? 0, width: width ?? 0 }}
            rowComponent={CommentRowComponent}
            rowCount={comments.length}
            rowHeight={COMMENT_ROW_HEIGHT}
            rowProps={rowProps}
            overscanCount={5}
          />
        )}
      />
    </div>
  );
};
