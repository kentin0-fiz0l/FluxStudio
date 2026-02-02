import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MousePointer,
  Eye,
  MessageCircle,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share,
  Lock,
  Unlock,
  Edit,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface CollaboratorCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  lastUpdate: Date;
}

interface CollaboratorPresence {
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor: string;
  status: 'active' | 'idle' | 'away';
  currentTool: string;
  isTyping: boolean;
  lastSeen: Date;
}

interface RealTimeEdit {
  id: string;
  userId: string;
  userName: string;
  type: 'text' | 'shape' | 'image' | 'annotation';
  action: 'create' | 'update' | 'delete';
  elementId: string;
  timestamp: Date;
  changes: any;
  isConflict?: boolean;
}

interface CollaborationSession {
  id: string;
  projectId: string;
  hostId: string;
  participants: CollaboratorPresence[];
  isLocked: boolean;
  permissions: {
    canEdit: string[];
    canComment: string[];
    canView: string[];
  };
  settings: {
    allowVoice: boolean;
    allowVideo: boolean;
    allowScreenShare: boolean;
    requireApproval: boolean;
  };
}

interface RealTimeCollaborationProps {
  session: CollaborationSession;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  isConnected: boolean;
  onJoinSession: () => void;
  onLeaveSession: () => void;
  onToggleLock: () => void;
  onUpdatePermissions: (permissions: CollaborationSession['permissions']) => void;
  onSendMessage: (message: string) => void;
  onToggleVoice?: () => void;
  onToggleVideo?: () => void;
  onStartScreenShare?: () => void;
}

const _userColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const RealTimeCollaboration: React.FC<RealTimeCollaborationProps> = ({
  session,
  currentUser,
  isConnected,
  onJoinSession,
  onLeaveSession,
  onToggleLock,
  onUpdatePermissions: _onUpdatePermissions,
  onSendMessage,
  onToggleVoice,
  onToggleVideo,
  onStartScreenShare
}) => {
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  const [recentEdits] = useState<RealTimeEdit[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [message, setMessage] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, _setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');

  const containerRef = useRef<HTMLDivElement>(null);
  const isHost = session.hostId === currentUser.id;
  const canEdit = session.permissions.canEdit.includes(currentUser.id);
  const participantCount = session.participants.length;

  // Simulate cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isConnected || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const _x = ((e.clientX - rect.left) / rect.width) * 100;
      const _y = ((e.clientY - rect.top) / rect.height) * 100;

      // In real implementation, this would emit to websocket
      // For demo, we'll just update local state occasionally
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isConnected]);

  // Simulate presence updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate other users' cursors
      setCursors(_prev =>
        session.participants
          .filter(p => p.userId !== currentUser.id && p.status === 'active')
          .map(p => ({
            userId: p.userId,
            userName: p.userName,
            userColor: p.userColor,
            x: Math.random() * 100,
            y: Math.random() * 100,
            lastUpdate: new Date()
          }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [session.participants, currentUser.id]);

  const getStatusIcon = (status: CollaboratorPresence['status']) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'idle':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'away':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getConnectionIcon = () => {
    if (!isConnected) return <WifiOff className="w-4 h-4 text-red-500" />;

    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-red-500" />;
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Collaboration Header */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Connection & Participants */}
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {getConnectionIcon()}
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Participant Avatars */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{participantCount}</span>
                </button>

                <div className="flex -space-x-2">
                  {session.participants.slice(0, 4).map((participant) => (
                    <div
                      key={participant.userId}
                      className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                      style={{ backgroundColor: participant.userColor }}
                    >
                      {participant.userAvatar ? (
                        <img
                          src={participant.userAvatar}
                          alt={participant.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-medium">
                          {participant.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(participant.status)}
                      </div>
                    </div>
                  ))}
                  {participantCount > 4 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{participantCount - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center - Session Status */}
            <div className="flex items-center space-x-2">
              {session.isLocked && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg">
                  <Lock className="w-3 h-3" />
                  <span className="text-xs font-medium">Locked</span>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Live Session
              </div>

              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>

            {/* Right Side - Controls */}
            <div className="flex items-center space-x-2">
              {/* Voice/Video Controls */}
              {session.settings.allowVoice && onToggleVoice && (
                <button
                  onClick={() => {
                    onToggleVoice();
                    setIsVoiceEnabled(!isVoiceEnabled);
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isVoiceEnabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {isVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              )}

              {session.settings.allowVideo && onToggleVideo && (
                <button
                  onClick={() => {
                    onToggleVideo();
                    setIsVideoEnabled(!isVideoEnabled);
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isVideoEnabled
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              )}

              {/* Screen Share */}
              {session.settings.allowScreenShare && onStartScreenShare && (
                <button
                  onClick={() => {
                    onStartScreenShare();
                    setIsScreenSharing(!isScreenSharing);
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isScreenSharing
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Share className="w-4 h-4" />
                </button>
              )}

              {/* Session Lock (Host only) */}
              {isHost && (
                <button
                  onClick={onToggleLock}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    session.isLocked
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {session.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
              )}

              {/* Activity Feed */}
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Zap className="w-4 h-4" />
              </button>

              {/* Leave Session */}
              <button
                onClick={onLeaveSession}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborator Cursors */}
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.userId}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute pointer-events-none z-40"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            color: cursor.userColor
          }}
        >
          <div className="relative">
            <MousePointer className="w-5 h-5" style={{ color: cursor.userColor }} />
            <div
              className="absolute top-6 left-0 px-2 py-1 rounded-md text-white text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Participants ({participantCount})</h3>
            </div>

            <div className="p-4 space-y-3">
              {session.participants.map((participant) => (
                <div key={participant.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: participant.userColor }}
                    >
                      {participant.userAvatar ? (
                        <img
                          src={participant.userAvatar}
                          alt={participant.userName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        participant.userName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {participant.userName}
                        {participant.userId === currentUser.id && ' (You)'}
                        {participant.userId === session.hostId && ' (Host)'}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(participant.status)}
                        <span className="text-xs text-gray-500 capitalize">
                          {participant.status}
                        </span>
                        {participant.isTyping && (
                          <span className="text-xs text-blue-600">typing...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {canEdit && (
                      <span title="Can edit"><Edit className="w-3 h-3 text-green-500" aria-hidden="true" /></span>
                    )}
                    <span title="Can view"><Eye className="w-3 h-3 text-blue-500" aria-hidden="true" /></span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Feed */}
      <AnimatePresence>
        {showActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            </div>

            <div className="p-4 space-y-3">
              {recentEdits.length > 0 ? (
                recentEdits.map((edit) => (
                  <div key={edit.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{edit.userName}</span>
                        {' '}
                        {edit.action === 'create' && 'created'}
                        {edit.action === 'update' && 'updated'}
                        {edit.action === 'delete' && 'deleted'}
                        {' '}
                        <span className="text-gray-600">{edit.type}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {edit.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input (if not connected, show join button) */}
      <div className="absolute bottom-4 left-4 z-50">
        {isConnected ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 w-80">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onJoinSession}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg"
          >
            Join Collaboration Session
          </button>
        )}
      </div>

      {/* Connection Quality Indicator */}
      <div className="absolute top-20 left-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-2">
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <span className="text-xs text-gray-600">
              {connectionQuality} connection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RealTimeCollaboration;
